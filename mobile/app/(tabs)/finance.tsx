import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Plus, ArrowUpRight, ArrowDownLeft, Trash2, CreditCard } from 'lucide-react-native'
import { useFinance } from '../../src/hooks/useFinance'
import { useMochiReaction } from '../../src/hooks/useMochiReaction'
import {
  MochiCard,
  MochiButton,
  MochiInput,
  KeyboardSafeModal,
} from '../../src/components/ui'
import {
  formatVND,
  formatTransactionAmount,
  todayString,
  formatDate,
  parseAndValidateVNDAmount,
} from '@mochi/shared'
import { colors, typography, spacing, radius } from '../../src/theme/tokens'

export default function FinanceScreen() {
  const {
    wallets,
    categories,
    transactions,
    totalBalance,
    monthExpense,
    monthIncome,
    loading,
    addTransaction,
    deleteTransaction,
    adjustWalletBalance,
    refetch,
  } = useFinance()

  const { triggerReaction } = useMochiReaction()
  const [refreshing, setRefreshing] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Wallet Balance Adjustment Modal State
  const [editingWallet, setEditingWallet] = useState<any | null>(null)
  const [newWalletBalance, setNewWalletBalance] = useState('')
  const [submittingWalletBalance, setSubmittingWalletBalance] = useState(false)

  // New Transaction Form State
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [walletId, setWalletId] = useState<string>('')
  const [description, setDescription] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const onRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  const handleOpenAdd = () => {
    setType('expense')
    setAmount('')
    setDescription('')
    setNote('')
    setWalletId(wallets[0]?.id || '')
    const defaultCat = categories.find(c => c.type === 'expense')
    setCategoryId(defaultCat?.id || '')
    setIsModalOpen(true)
  }

  const handleTypeChange = (newType: 'expense' | 'income') => {
    setType(newType)
    const matchingCat = categories.find(c => c.type === newType)
    setCategoryId(matchingCat?.id || '')
  }

  const handleSubmitTransaction = async () => {
    const validation = parseAndValidateVNDAmount(amount)
    if (!validation.valid || validation.value <= 0) {
      Alert.alert('Thông báo', validation.error || 'Vui lòng nhập số tiền hợp lệ (> 0 VNĐ)')
      return
    }

    setSubmitting(true)
    try {
      await addTransaction({
        type,
        amount: validation.value,
        transaction_date: todayString(),
        category_id: categoryId || undefined,
        wallet_id: walletId || undefined,
        description: description.trim() || undefined,
        note: note.trim() || undefined,
      })

      setIsModalOpen(false)

      // Trigger AI reaction
      triggerReaction(
        type === 'income' ? 'transaction_income_created' : 'transaction_expense_created'
      )
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể tạo giao dịch')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveWalletBalance = async () => {
    if (!editingWallet) return
    const validation = parseAndValidateVNDAmount(newWalletBalance)
    if (!validation.valid) {
      Alert.alert('Thông báo', validation.error || 'Vui lòng nhập số dư hợp lệ')
      return
    }

    setSubmittingWalletBalance(true)
    try {
      await adjustWalletBalance({
        walletId: editingWallet.id,
        balance: validation.value,
        asOfDate: todayString(),
      })
      setEditingWallet(null)
      setNewWalletBalance('')
      Alert.alert('Thành công', `Đã cập nhật số dư cho ${editingWallet.name}! 🎉`)
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể cập nhật số dư ví')
    } finally {
      setSubmittingWalletBalance(false)
    }
  }

  const handleDelete = (txId: string, desc: string) => {
    Alert.alert(
      'Xóa giao dịch',
      `Bạn có chắc chắn muốn xóa giao dịch "${desc || 'này'}"? Số dư ví liên quan sẽ được tự động hoàn lại an toàn.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(txId)
            try {
              await deleteTransaction(txId)
            } catch (e: any) {
              Alert.alert('Lỗi', e.message || 'Không thể xóa giao dịch')
            } finally {
              setDeletingId(null)
            }
          },
        },
      ]
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing || loading}
            onRefresh={onRefresh}
            colors={[colors.cheese]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Quản lý Chi tiêu 💰</Text>
          <TouchableOpacity style={styles.addIconBtn} onPress={handleOpenAdd} activeOpacity={0.8}>
            <Plus size={20} color={colors.white} />
          </TouchableOpacity>
        </View>

        {/* Total Net Worth Card */}
        <MochiCard style={styles.balanceCard} accentColor={colors.cheese}>
          <Text style={styles.balanceLabel}>Tổng số dư khả dụng</Text>
          <Text style={styles.balanceValue}>{formatVND(totalBalance)}</Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIcon, { backgroundColor: colors.mintLight }]}>
                <ArrowDownLeft size={16} color={colors.mintDark} />
              </View>
              <View>
                <Text style={styles.summaryLabel}>Thu tháng này</Text>
                <Text style={styles.incomeValue}>+{formatVND(monthIncome)}</Text>
              </View>
            </View>

            <View style={styles.summaryItem}>
              <View style={[styles.summaryIcon, { backgroundColor: colors.peachLight }]}>
                <ArrowUpRight size={16} color={colors.peachDark} />
              </View>
              <View>
                <Text style={styles.summaryLabel}>Chi tháng này</Text>
                <Text style={styles.expenseValue}>-{formatVND(monthExpense)}</Text>
              </View>
            </View>
          </View>
        </MochiCard>

        {/* Wallets Horizontal List */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
          <Text style={styles.sectionTitle}>Ví tiền 💳</Text>
          <Text style={{ fontSize: 12, color: colors.chocolateMuted, fontWeight: '700' }}>Nhấn để sửa số dư</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.walletsScroll}
          contentContainerStyle={{ paddingRight: spacing.lg }}
        >
          {wallets.length === 0 ? (
            <MochiCard style={styles.walletCard}>
              <Text style={styles.walletName}>Chưa có ví nào</Text>
            </MochiCard>
          ) : (
            wallets.map(wallet => (
              <TouchableOpacity
                key={wallet.id}
                activeOpacity={0.85}
                onPress={() => {
                  setEditingWallet(wallet)
                  setNewWalletBalance(wallet.balance.toString())
                }}
              >
                <MochiCard style={styles.walletCard}>
                  <View style={styles.walletHeader}>
                    <Text style={styles.walletIcon}>{wallet.icon || '🪙'}</Text>
                    <Text style={styles.walletName}>{wallet.name}</Text>
                  </View>
                  <Text style={styles.walletBalance}>{formatVND(wallet.balance)}</Text>
                </MochiCard>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* Recent Transactions List */}
        <View style={styles.transactionsHeader}>
          <Text style={styles.sectionTitle}>Giao dịch gần đây 📝</Text>
          <MochiButton title="+ Thêm mới" size="sm" onPress={handleOpenAdd} />
        </View>

        <MochiCard style={styles.txListCard}>
          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyMascot}>🐱💳</Text>
              <Text style={styles.emptyText}>
                Chưa có giao dịch nào. Bấm '+ Thêm mới' để ghi chép nhé!
              </Text>
            </View>
          ) : (
            transactions.map(tx => (
              <View key={tx.id} style={styles.txItem}>
                <View style={styles.txLeft}>
                  <Text style={styles.txIcon}>
                    {tx.category?.icon || (tx.type === 'income' ? '💰' : '🍜')}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txDesc}>
                      {tx.description || tx.category?.name || 'Giao dịch'}
                    </Text>
                    <Text style={styles.txDate}>
                      {formatDate(tx.transaction_date)} • {tx.wallet?.name || 'Ví'}
                    </Text>
                  </View>
                </View>
                <View style={styles.txRight}>
                  <Text
                    style={[
                      styles.txAmount,
                      tx.type === 'income' ? styles.txIncome : styles.txExpense,
                    ]}
                  >
                    {formatTransactionAmount(tx.amount, tx.type)}
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      handleDelete(tx.id, tx.description || tx.category?.name || 'giao dịch này')
                    }
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.deleteBtn}
                  >
                    <Trash2 size={15} color={colors.chocolateMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </MochiCard>
      </ScrollView>

      {/* Keyboard-Safe Add Transaction Modal */}
      <KeyboardSafeModal
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        <Text style={styles.modalTitle}>Thêm giao dịch 📝</Text>

        {/* Type selector */}
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[styles.typeBtn, type === 'expense' && styles.typeBtnActiveExpense]}
            onPress={() => handleTypeChange('expense')}
          >
            <Text style={[styles.typeBtnText, type === 'expense' && styles.typeBtnTextActive]}>
              Khoản chi 💸
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, type === 'income' && styles.typeBtnActiveIncome]}
            onPress={() => handleTypeChange('income')}
          >
            <Text style={[styles.typeBtnText, type === 'income' && styles.typeBtnTextActive]}>
              Khoản thu 💰
            </Text>
          </TouchableOpacity>
        </View>

        {/* Amount Input */}
        <MochiInput
          label="Số tiền (VNĐ) *"
          placeholder="50000"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          autoFocus
        />

        {/* Description Input */}
        <MochiInput
          label="Mô tả"
          placeholder="Ăn trưa, cafe, mua sắm..."
          value={description}
          onChangeText={setDescription}
        />

        {/* Wallet selection */}
        {wallets.length > 0 && (
          <View style={styles.sectionBlock}>
            <Text style={styles.fieldLabel}>Chọn ví thanh toán</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
              {wallets.map(w => (
                <TouchableOpacity
                  key={w.id}
                  style={[styles.pillChip, walletId === w.id && styles.pillChipActive]}
                  onPress={() => setWalletId(w.id)}
                >
                  <Text>{w.icon || '🪙'}</Text>
                  <Text
                    style={[
                      styles.pillChipText,
                      walletId === w.id && styles.pillChipTextActive,
                    ]}
                  >
                    {w.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Category selection */}
        <View style={styles.sectionBlock}>
          <Text style={styles.fieldLabel}>Danh mục</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
            {categories
              .filter(c => c.type === type)
              .map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.pillChip, categoryId === c.id && styles.pillChipActive]}
                  onPress={() => setCategoryId(c.id)}
                >
                  <Text>{c.icon}</Text>
                  <Text
                    style={[
                      styles.pillChipText,
                      categoryId === c.id && styles.pillChipTextActive,
                    ]}
                  >
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
          </ScrollView>
        </View>

        {/* Note Input */}
        <MochiInput
          label="Ghi chú (tùy chọn)"
          placeholder="Chi tiết bổ sung..."
          value={note}
          onChangeText={setNote}
        />

        {/* Actions */}
        <View style={styles.modalActions}>
          <MochiButton
            title="Hủy"
            variant="ghost"
            onPress={() => setIsModalOpen(false)}
            style={{ flex: 1 }}
          />
          <MochiButton
            title="Lưu giao dịch"
            loading={submitting}
            disabled={submitting}
            onPress={handleSubmitTransaction}
            style={{ flex: 1.5 }}
          />
        </View>
      </KeyboardSafeModal>

      {/* Keyboard-Safe Adjust Wallet Balance Modal */}
      <KeyboardSafeModal
        visible={!!editingWallet}
        onClose={() => setEditingWallet(null)}
      >
        <Text style={styles.modalTitle}>
          Sửa / Chốt số dư {editingWallet?.icon} {editingWallet?.name}
        </Text>
        <Text style={{ fontSize: 13, color: colors.chocolateMuted, marginBottom: spacing.md, lineHeight: 18 }}>
          Nhập số dư thực tế hiện tại. Các giao dịch sau thời điểm này sẽ tự động được cộng/trừ chính xác.
        </Text>
        <MochiInput
          label="Số dư thực tế (VNĐ) *"
          placeholder="0"
          value={newWalletBalance}
          onChangeText={setNewWalletBalance}
          keyboardType="numeric"
          autoFocus
        />
        <View style={styles.modalActions}>
          <MochiButton
            title="Hủy"
            variant="ghost"
            onPress={() => setEditingWallet(null)}
            style={{ flex: 1 }}
          />
          <MochiButton
            title="Xác nhận"
            loading={submittingWalletBalance}
            disabled={submittingWalletBalance}
            onPress={handleSaveWalletBalance}
            style={{ flex: 1.5 }}
          />
        </View>
      </KeyboardSafeModal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.titleLarge,
    fontWeight: '900',
    color: colors.chocolate,
  },
  addIconBtn: {
    backgroundColor: colors.cheese,
    width: 38,
    height: 38,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  balanceCard: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    marginBottom: spacing.lg,
  },
  balanceLabel: {
    ...typography.caption,
    color: colors.chocolateMuted,
    fontWeight: '700',
  },
  balanceValue: {
    ...typography.titleLarge,
    fontSize: 28,
    fontWeight: '900',
    color: colors.chocolate,
    marginVertical: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.chocolateBorder,
  },
  summaryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summarySub: {
    ...typography.caption,
    color: colors.chocolateMuted,
  },
  summaryNum: {
    ...typography.bodySmall,
    fontWeight: '800',
    color: colors.chocolate,
  },
  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.chocolateBorder,
    marginHorizontal: spacing.sm,
  },
  sectionTitle: {
    ...typography.titleSmall,
    fontWeight: '800',
    color: colors.chocolate,
    marginBottom: spacing.sm,
  },
  walletsScroll: {
    marginBottom: spacing.lg,
  },
  walletCard: {
    width: 150,
    marginRight: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.white,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  walletIcon: {
    fontSize: 18,
  },
  walletName: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.chocolateLight,
  },
  walletBalance: {
    ...typography.bodyMedium,
    fontWeight: '800',
    color: colors.chocolate,
  },
  transactionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  txListCard: {
    padding: 0,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  emptyState: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyMascot: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.chocolateMuted,
    textAlign: 'center',
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.chocolateBorder,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  txIcon: {
    fontSize: 22,
  },
  txDesc: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.chocolate,
  },
  txDate: {
    ...typography.caption,
    color: colors.chocolateMuted,
    marginTop: 2,
  },
  txRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  txAmount: {
    ...typography.bodyMedium,
    fontWeight: '800',
  },
  txIncome: {
    color: colors.mintDark,
  },
  txExpense: {
    color: colors.peachDark,
  },
  deleteBtn: {
    padding: 4,
  },
  modalTitle: {
    ...typography.titleMedium,
    fontWeight: '900',
    color: colors.chocolate,
    marginBottom: spacing.md,
    marginTop: 4,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.chocolateBorder,
    alignItems: 'center',
  },
  typeBtnActiveExpense: {
    backgroundColor: colors.peachLight,
    borderColor: colors.peach,
  },
  typeBtnActiveIncome: {
    backgroundColor: colors.mintLight,
    borderColor: colors.mint,
  },
  typeBtnText: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.chocolateMuted,
  },
  typeBtnTextActive: {
    color: colors.chocolate,
  },
  sectionBlock: {
    marginBottom: 12,
  },
  fieldLabel: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.chocolateLight,
    marginBottom: 6,
  },
  pillScroll: {
    marginBottom: 4,
  },
  pillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.chocolateBorder,
    backgroundColor: colors.cream,
    marginRight: 8,
  },
  pillChipActive: {
    backgroundColor: colors.cheeseLight,
    borderColor: colors.cheese,
  },
  pillChipText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.chocolate,
  },
  pillChipTextActive: {
    fontWeight: '800',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: spacing.md,
  },
})
