import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Modal, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Plus, ArrowUpRight, ArrowDownLeft } from 'lucide-react-native'
import { useFinance } from '../../src/hooks/useFinance'
import { MochiCard } from '../../src/components/ui/MochiCard'
import { MochiButton } from '../../src/components/ui/MochiButton'
import { MochiInput } from '../../src/components/ui/MochiInput'
import { formatVND, formatTransactionAmount, todayString, formatDate } from '@mochi/shared'
import { colors, typography, spacing, radius } from '../../src/theme/tokens'

export default function FinanceScreen() {
  const { wallets, categories, transactions, totalBalance, monthExpense, monthIncome, loading, addTransaction, refetch } = useFinance()
  const [refreshing, setRefreshing] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // New Transaction Form State
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [walletId, setWalletId] = useState<string>('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  const handleOpenAdd = () => {
    setType('expense')
    setAmount('')
    setDescription('')
    setWalletId(wallets[0]?.id || '')
    const defaultCat = categories.find(c => c.type === 'expense')
    setCategoryId(defaultCat?.id || '')
    setIsModalOpen(true)
  }

  const handleSubmitTransaction = async () => {
    const numericAmount = parseFloat(amount.replace(/[^0-9]/g, ''))
    if (!numericAmount || numericAmount <= 0) {
      Alert.alert('Thông báo', 'Vui lòng nhập số tiền hợp lệ')
      return
    }

    setSubmitting(true)
    try {
      await addTransaction({
        type,
        amount: numericAmount,
        transaction_date: todayString(),
        category_id: categoryId || undefined,
        wallet_id: walletId || undefined,
        description: description.trim() || undefined,
      })
      setIsModalOpen(false)
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể tạo giao dịch')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing || loading} onRefresh={onRefresh} colors={[colors.cheese]} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Quản lý tài chính 💰</Text>
          <TouchableOpacity style={styles.addIconBtn} onPress={handleOpenAdd}>
            <Plus size={20} color={colors.chocolate} />
          </TouchableOpacity>
        </View>

        {/* Total Balance Card */}
        <MochiCard style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Tổng số dư ví</Text>
          <Text style={styles.balanceValue}>{formatVND(totalBalance)}</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIcon, { backgroundColor: colors.mintLight }]}>
                <ArrowDownLeft size={16} color={colors.mintDark} />
              </View>
              <View>
                <Text style={styles.summarySub}>Thu tháng</Text>
                <Text style={styles.summaryNum}>+{formatVND(monthIncome)}</Text>
              </View>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <View style={[styles.summaryIcon, { backgroundColor: colors.peachLight }]}>
                <ArrowUpRight size={16} color={colors.peachDark} />
              </View>
              <View>
                <Text style={styles.summarySub}>Chi tháng</Text>
                <Text style={styles.summaryNum}>-{formatVND(monthExpense)}</Text>
              </View>
            </View>
          </View>
        </MochiCard>

        {/* Wallets Horizontal List */}
        <Text style={styles.sectionTitle}>Ví tiền 💳</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.walletsScroll}>
          {wallets.map(wallet => (
            <MochiCard key={wallet.id} style={styles.walletCard}>
              <View style={styles.walletHeader}>
                <Text style={styles.walletIcon}>{wallet.icon || '🪙'}</Text>
                <Text style={styles.walletName}>{wallet.name}</Text>
              </View>
              <Text style={styles.walletBalance}>{formatVND(wallet.balance)}</Text>
            </MochiCard>
          ))}
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
              <Text style={styles.emptyText}>Chưa có giao dịch nào. Bấm '+ Thêm mới' để ghi chép nhé!</Text>
            </View>
          ) : (
            transactions.map(tx => (
              <View key={tx.id} style={styles.txItem}>
                <View style={styles.txLeft}>
                  <Text style={styles.txIcon}>{tx.category?.icon || (tx.type === 'income' ? '💰' : '🍜')}</Text>
                  <View>
                    <Text style={styles.txDesc}>{tx.description || tx.category?.name || 'Giao dịch'}</Text>
                    <Text style={styles.txDate}>{formatDate(tx.transaction_date)} • {tx.wallet?.name || 'Ví'}</Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.txAmount,
                    tx.type === 'income' ? styles.txIncome : styles.txExpense,
                  ]}
                >
                  {formatTransactionAmount(tx.amount, tx.type)}
                </Text>
              </View>
            ))
          )}
        </MochiCard>
      </ScrollView>

      {/* Add Transaction Modal */}
      <Modal visible={isModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Thêm giao dịch 📝</Text>

            {/* Type selector */}
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeBtn, type === 'expense' && styles.typeBtnActiveExpense]}
                onPress={() => setType('expense')}
              >
                <Text style={[styles.typeBtnText, type === 'expense' && styles.typeBtnTextActive]}>Khoản chi</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, type === 'income' && styles.typeBtnActiveIncome]}
                onPress={() => setType('income')}
              >
                <Text style={[styles.typeBtnText, type === 'income' && styles.typeBtnTextActive]}>Khoản thu</Text>
              </TouchableOpacity>
            </View>

            <MochiInput
              label="Số tiền (VNĐ)"
              placeholder="50000"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />

            <MochiInput
              label="Mô tả"
              placeholder="Ăn trưa, cafe, mua sắm..."
              value={description}
              onChangeText={setDescription}
            />

            {/* Category selection */}
            <Text style={styles.fieldLabel}>Danh mục</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
              {categories
                .filter(c => c.type === type)
                .map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.catChip, categoryId === c.id && styles.catChipActive]}
                    onPress={() => setCategoryId(c.id)}
                  >
                    <Text>{c.icon}</Text>
                    <Text style={[styles.catChipText, categoryId === c.id && styles.catChipTextActive]}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <MochiButton title="Hủy" variant="ghost" onPress={() => setIsModalOpen(false)} style={{ flex: 1 }} />
              <MochiButton title="Lưu giao dịch" loading={submitting} onPress={handleSubmitTransaction} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
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
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceCard: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    marginBottom: spacing.lg,
  },
  balanceLabel: {
    ...typography.bodySmall,
    color: colors.chocolateMuted,
    fontWeight: '600',
  },
  balanceValue: {
    ...typography.titleLarge,
    fontSize: 28,
    fontWeight: '900',
    color: colors.chocolate,
    marginVertical: spacing.sm,
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
    gap: 8,
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.chocolateBorder,
    marginHorizontal: 8,
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summarySub: {
    ...typography.caption,
    color: colors.chocolateMuted,
  },
  summaryNum: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.chocolate,
  },
  sectionTitle: {
    ...typography.titleSmall,
    color: colors.chocolate,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  walletsScroll: {
    marginBottom: spacing.lg,
  },
  walletCard: {
    width: 160,
    marginRight: 10,
    padding: spacing.md,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  walletIcon: {
    fontSize: 16,
  },
  walletName: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.chocolate,
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
    padding: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
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
    paddingVertical: 12,
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
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.chocolate,
  },
  txDate: {
    ...typography.caption,
    color: colors.chocolateMuted,
    marginTop: 2,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(61, 43, 31, 0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: 36,
  },
  modalTitle: {
    ...typography.titleMedium,
    fontWeight: '900',
    color: colors.chocolate,
    marginBottom: spacing.md,
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
  fieldLabel: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.chocolateLight,
    marginBottom: 6,
  },
  catScroll: {
    marginBottom: spacing.lg,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.chocolateBorder,
    marginRight: 8,
  },
  catChipActive: {
    backgroundColor: colors.cheeseLight,
    borderColor: colors.cheese,
  },
  catChipText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.chocolate,
  },
  catChipTextActive: {
    fontWeight: '800',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
})
