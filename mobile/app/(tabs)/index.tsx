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
import { useRouter } from 'expo-router'
import {
  CheckCircle2,
  Circle,
  Flame,
  Trophy,
  Plus,
  Trash2,
} from 'lucide-react-native'
import { useDashboardData } from '../../src/hooks/useDashboardData'
import { useFinance } from '../../src/hooks/useFinance'
import { useFitness } from '../../src/hooks/useFitness'
import { useChinese } from '../../src/hooks/useChinese'
import {
  MochiCard,
  StatCard,
  MochiButton,
  MochiInput,
} from '../../src/components/ui'
import { formatVNDCompact, getGreeting } from '@mochi/shared'
import { colors, typography, spacing, radius } from '../../src/theme/tokens'

export default function DashboardScreen() {
  const router = useRouter()
  const {
    profile,
    levelData,
    checklist,
    streak,
    loading: dashboardLoading,
    toggleChecklist,
    addChecklistItem,
    deleteChecklistItem,
    refetch: dashboardRefetch,
  } = useDashboardData()

  const {
    totalBalance,
    monthExpense,
    loading: financeLoading,
    refetch: financeRefetch,
  } = useFinance()

  const {
    latestWeight,
    currentBMI,
    weeklyMinutes,
    loading: fitnessLoading,
    refetch: fitnessRefetch,
  } = useFitness()

  const {
    dueCount,
    learnedCount,
    loading: chineseLoading,
    refetch: chineseRefetch,
  } = useChinese()

  const [refreshing, setRefreshing] = useState(false)
  const [newTodoText, setNewTodoText] = useState('')
  const [isAddingTodo, setIsAddingTodo] = useState(false)
  const [submittingTodo, setSubmittingTodo] = useState(false)

  const onRefresh = async () => {
    setRefreshing(true)
    await Promise.all([
      dashboardRefetch(),
      financeRefetch(),
      fitnessRefetch(),
      chineseRefetch(),
    ])
    setRefreshing(false)
  }

  const handleAddTodo = async () => {
    if (!newTodoText.trim()) return
    setSubmittingTodo(true)
    try {
      await addChecklistItem({ item_text: newTodoText.trim(), category: 'other' })
      setNewTodoText('')
      setIsAddingTodo(false)
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể thêm mục')
    } finally {
      setSubmittingTodo(false)
    }
  }

  const greeting = getGreeting()
  const displayName = profile?.display_name || 'Bạn Mochi'
  const isGlobalLoading =
    dashboardLoading || financeLoading || fitnessLoading || chineseLoading

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isGlobalLoading}
            onRefresh={onRefresh}
            colors={[colors.cheese]}
          />
        }
      >
        {/* Header Profile & Level */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}, 🐱</Text>
            <Text style={styles.userName}>{displayName}</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/achievements')}
            style={styles.levelBadge}
            accessibilityLabel={`Xem thành tích, cấp độ ${levelData?.level || 1}`}
          >
            <Trophy size={16} color={colors.chocolate} />
            <Text style={styles.levelText}>Lv.{levelData?.level || 1}</Text>
          </TouchableOpacity>
        </View>

        {/* XP Progress Bar */}
        <MochiCard style={styles.xpCard}>
          <View style={styles.xpRow}>
            <Text style={styles.xpLabel}>Cấp độ {levelData?.level || 1}</Text>
            <Text style={styles.xpValue}>
              {levelData?.currentProgressXP || 0} / {levelData?.neededXPForNextLevel || 100} XP
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[styles.progressBarFill, { width: `${levelData?.progressPct || 0}%` }]}
            />
          </View>
        </MochiCard>

        {/* Quick Stats Grid */}
        <Text style={styles.sectionTitle}>Chỉ số nhanh 📊</Text>
        <View style={styles.grid}>
          <StatCard
            title="Số dư ví"
            value={formatVNDCompact(totalBalance)}
            subtitle={`Chi tháng: ${formatVNDCompact(monthExpense)}`}
            icon="💰"
            accentColor={colors.mint}
            onPress={() => router.push('/(tabs)/finance')}
            style={styles.gridItem}
          />
          <StatCard
            title="Cân nặng"
            value={latestWeight > 0 ? `${latestWeight} kg` : '--'}
            subtitle={currentBMI ? `BMI: ${currentBMI.toFixed(1)}` : 'Chưa đặt'}
            icon="⚖️"
            accentColor={colors.peach}
            onPress={() => router.push('/(tabs)/fitness')}
            style={styles.gridItem}
          />
          <StatCard
            title="Cần ôn tập"
            value={`${dueCount} từ`}
            subtitle={`Đã học: ${learnedCount} từ`}
            icon="🈶"
            accentColor={colors.lavender}
            onPress={() => router.push('/(tabs)/chinese')}
            style={styles.gridItem}
          />
          <StatCard
            title="Chuỗi học"
            value={`${streak} ngày`}
            subtitle={`Tập: ${weeklyMinutes}p tuần`}
            icon={<Flame size={20} color={colors.peach} />}
            accentColor={colors.cheese}
            style={styles.gridItem}
          />
        </View>

        {/* Daily Checklist */}
        <View style={styles.checklistHeader}>
          <Text style={styles.sectionTitle}>Mục tiêu hôm nay 🎯</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setIsAddingTodo(!isAddingTodo)}
            activeOpacity={0.8}
          >
            <Plus size={16} color={colors.chocolate} />
            <Text style={styles.addBtnText}>Thêm mục</Text>
          </TouchableOpacity>
        </View>

        {isAddingTodo && (
          <MochiCard style={styles.addTodoCard}>
            <MochiInput
              placeholder="Nhập việc cần làm hôm nay..."
              value={newTodoText}
              onChangeText={setNewTodoText}
              autoFocus
              onSubmitEditing={handleAddTodo}
            />
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
              <MochiButton
                title="Hủy"
                variant="ghost"
                size="sm"
                onPress={() => setIsAddingTodo(false)}
              />
              <MochiButton
                title="Thêm ngay"
                size="sm"
                loading={submittingTodo}
                disabled={submittingTodo}
                onPress={handleAddTodo}
              />
            </View>
          </MochiCard>
        )}

        <MochiCard style={styles.checklistCard}>
          {checklist.length === 0 ? (
            <View style={styles.emptyChecklist}>
              <Text style={styles.emptyChecklistText}>
                Hôm nay bạn chưa có mục tiêu nào. Bấm '+ Thêm mục' để tạo nhé! 🐱✨
              </Text>
            </View>
          ) : (
            checklist.map(item => (
              <View key={item.id} style={styles.checklistItem}>
                <TouchableOpacity
                  style={styles.checkRow}
                  onPress={() =>
                    toggleChecklist({ id: item.id, is_completed: !item.is_completed })
                  }
                  activeOpacity={0.7}
                >
                  {item.is_completed ? (
                    <CheckCircle2 size={22} color={colors.mintDark} />
                  ) : (
                    <Circle size={22} color={colors.chocolateMuted} />
                  )}
                  <Text
                    style={[
                      styles.checklistText,
                      item.is_completed && styles.checklistTextCompleted,
                    ]}
                  >
                    {item.item_text}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => deleteChecklistItem(item.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ padding: 4 }}
                >
                  <Trash2 size={15} color={colors.chocolateMuted} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </MochiCard>
      </ScrollView>
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
  greeting: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.chocolateMuted,
  },
  userName: {
    ...typography.titleLarge,
    fontWeight: '900',
    color: colors.chocolate,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.cheese,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  levelText: {
    ...typography.caption,
    fontWeight: '900',
    color: colors.chocolate,
  },
  xpCard: {
    padding: spacing.md,
    backgroundColor: colors.white,
    marginBottom: spacing.lg,
  },
  xpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  xpLabel: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.chocolate,
  },
  xpValue: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.chocolateMuted,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.cream,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.cheese,
    borderRadius: radius.full,
  },
  sectionTitle: {
    ...typography.titleSmall,
    fontWeight: '800',
    color: colors.chocolate,
    marginBottom: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  gridItem: {
    width: '47.5%',
  },
  checklistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.cheeseLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  addBtnText: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.chocolate,
  },
  addTodoCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.white,
  },
  checklistCard: {
    padding: 0,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  emptyChecklist: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyChecklistText: {
    ...typography.bodySmall,
    color: colors.chocolateMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.chocolateBorder,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  checklistText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.chocolate,
    flex: 1,
  },
  checklistTextCompleted: {
    textDecorationLine: 'line-through',
    color: colors.chocolateMuted,
  },
})
