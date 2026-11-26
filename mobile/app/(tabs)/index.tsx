import React, { useRef, useState } from 'react'
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
  Sparkles,
  ArrowRight,
} from 'lucide-react-native'
import { useDashboardData } from '../../src/hooks/useDashboardData'
import { useFinance } from '../../src/hooks/useFinance'
import { useFitness } from '../../src/hooks/useFitness'
import { useChinese } from '../../src/hooks/useChinese'
import { useAI } from '../../src/hooks/useAI'
import {
  MochiCard,
  MochiBadge,
  StatCard,
  MochiButton,
  MochiInput,
  MochiSkeleton,
  MochiErrorState,
  MochiErrorBanner,
} from '../../src/components/ui'
import {
  formatVNDCompact,
  getGreeting,
  getDashboardNextAction,
  todayString,
  type DashboardActionId,
} from '@mochi/shared'
import { colors, typography, spacing, radius } from '../../src/theme/tokens'

export default function DashboardScreen() {
  const router = useRouter()
  const scrollRef = useRef<ScrollView>(null)
  const [checklistY, setChecklistY] = useState(0)

  const {
    profile,
    levelData,
    checklist,
    streak,
    todayStudyMinutes,
    loading: dashboardLoading,
    hasData: dashboardHasData,
    error: dashboardError,
    toggleChecklist,
    addChecklistItem,
    deleteChecklistItem,
    refetch: dashboardRefetch,
  } = useDashboardData()

  const {
    totalBalance,
    monthExpense,
    todayTransactionCount,
    monthBudgetAmount,
    loading: financeLoading,
    hasData: financeHasData,
    error: financeError,
    refetch: financeRefetch,
  } = useFinance()

  const {
    latestWeight,
    latestWeightDate,
    weightGoal,
    currentBMI,
    todayExerciseMinutes,
    weeklyMinutes,
    weeklySessions,
    weeklySessionTarget,
    loading: fitnessLoading,
    hasData: fitnessHasData,
    error: fitnessError,
    refetch: fitnessRefetch,
  } = useFitness()

  const {
    activeCourse,
    totalCount,
    dueCount,
    learnedCount,
    loading: chineseLoading,
    hasData: chineseHasData,
    error: chineseError,
    refetch: chineseRefetch,
  } = useChinese()

  const { dailyBrief } = useAI()

  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [newTodoText, setNewTodoText] = useState('')
  const [isAddingTodo, setIsAddingTodo] = useState(false)
  const [submittingTodo, setSubmittingTodo] = useState(false)

  const onRefresh = async () => {
    setRefreshing(true)
    setRefreshError(null)
    try {
      await Promise.all([
        dashboardRefetch(),
        financeRefetch(),
        fitnessRefetch(),
        chineseRefetch(),
      ])
    } catch {
      setRefreshError('Không thể làm mới dữ liệu lúc này. Vui lòng kiểm tra kết nối mạng.')
    } finally {
      setRefreshing(false)
    }
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

  const navigateForAction = (actionId: DashboardActionId) => {
    switch (actionId) {
      case 'review_vocab':
        router.push('/chinese/flashcard')
        break
      case 'study_session':
        router.push('/(tabs)/chinese')
        break
      case 'log_exercise':
      case 'log_weight':
      case 'first_log':
        router.push('/(tabs)/fitness')
        break
      case 'log_transaction':
        router.push('/(tabs)/finance')
        break
      case 'ask_ai':
        router.push('/(tabs)/ai')
        break
      case 'complete_checklist':
        scrollRef.current?.scrollTo({ y: Math.max(0, checklistY - 12), animated: true })
        break
    }
  }

  const greeting = getGreeting()
  const displayName = profile?.display_name || 'Bạn Mochi'

  const hasAnyCachedData =
    dashboardHasData && financeHasData && fitnessHasData && chineseHasData

  const isInitialLoading =
    !hasAnyCachedData &&
    (dashboardLoading || financeLoading || fitnessLoading || chineseLoading)

  const initialError =
    !hasAnyCachedData &&
    (dashboardError || financeError || fitnessError || chineseError)

  const completedChecklistCount = checklist.filter(c => c.is_completed).length
  const nextPendingItem = checklist.find(c => !c.is_completed)

  const focusPlan = getDashboardNextAction({
    today: todayString(),
    hasActiveCourse: !!activeCourse,
    totalVocabulary: totalCount,
    dueVocabulary: dueCount,
    todayStudyMinutes,
    streak,
    hasWeightGoal: !!weightGoal,
    latestWeightDate,
    todayExerciseMinutes,
    weekExerciseSessions: weeklySessions,
    weeklySessionTarget,
    totalChecklistCount: checklist.length,
    completedChecklistCount,
    nextChecklistItemText: nextPendingItem?.item_text ?? null,
    todayTransactionCount,
    monthExpense,
    monthBudgetAmount,
  })

  const activeErrorBanner =
    refreshError ||
    (hasAnyCachedData
      ? dashboardError || financeError || fitnessError || chineseError
      : null)

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.cheese]}
          />
        }
      >
        {/* Header Profile & Level */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>{greeting}, 🐱</Text>
            <Text style={styles.userName}>{displayName}</Text>
          </View>
          <View style={styles.headerBadges}>
            <View style={styles.streakPill} accessibilityLabel={`Chuỗi học ${streak} ngày`}>
              <Flame size={14} color={colors.peachDark} />
              <Text style={styles.streakPillText}>{streak}</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/achievements')}
              style={styles.levelBadge}
              accessibilityRole="button"
              accessibilityLabel={`Xem thành tích, cấp độ ${levelData?.level || 1}`}
            >
              <Trophy size={15} color={colors.chocolate} />
              <Text style={styles.levelText}>Lv.{levelData?.level || 1}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Initial Loading Skeletons */}
        {isInitialLoading ? (
          <View style={styles.skeletonStack}>
            <MochiCard style={styles.skeletonCard}>
              <MochiSkeleton width={120} height={22} />
              <MochiSkeleton width="85%" height={26} />
              <MochiSkeleton width="100%" height={36} />
              <MochiSkeleton width={160} height={40} borderRadius={radius.full} />
            </MochiCard>
            <MochiCard style={styles.skeletonCard}>
              <MochiSkeleton width={140} height={20} />
              <MochiSkeleton width="100%" height={48} />
              <MochiSkeleton width="100%" height={48} />
            </MochiCard>
            <View style={styles.grid}>
              {[1, 2, 3, 4].map(i => (
                <MochiCard key={i} style={[styles.gridItem, { gap: 8 }]}>
                  <MochiSkeleton width="60%" height={14} />
                  <MochiSkeleton width="80%" height={22} />
                  <MochiSkeleton width="50%" height={12} />
                </MochiCard>
              ))}
            </View>
          </View>
        ) : initialError ? (
          <MochiErrorState
            message={initialError}
            onRetry={onRefresh}
            retrying={refreshing}
          />
        ) : (
          <>
            {activeErrorBanner && (
              <MochiErrorBanner
                message={activeErrorBanner}
                onRetry={onRefresh}
                retrying={refreshing}
              />
            )}

            {/* TIER 1: Primary Next Action Focus Card */}
            <MochiCard
              style={[
                styles.heroCard,
                focusPlan.status === 'completed' && styles.heroCardCompleted,
              ]}
              accentColor={
                focusPlan.status === 'completed' ? colors.mintDark : colors.cheese
              }
            >
              <View style={styles.heroTopRow}>
                <MochiBadge
                  label={focusPlan.primary.badge}
                  variant={focusPlan.status === 'completed' ? 'mint' : 'cheese'}
                />
                {focusPlan.primary.contextPill && (
                  <Text style={styles.heroContext}>{focusPlan.primary.contextPill}</Text>
                )}
              </View>

              <Text style={styles.heroTitle}>{focusPlan.primary.title}</Text>
              <Text style={styles.heroDesc}>{focusPlan.primary.description}</Text>

              <MochiButton
                title={focusPlan.primary.ctaLabel}
                onPress={() => navigateForAction(focusPlan.primary.id)}
                icon={<ArrowRight size={16} color={colors.chocolate} />}
                style={styles.heroCtaBtn}
              />

              {focusPlan.secondary.length > 0 && (
                <View style={styles.secondaryRow}>
                  {focusPlan.secondary.map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.secondaryChip}
                      activeOpacity={0.8}
                      onPress={() => navigateForAction(item.id)}
                      accessibilityRole="button"
                      accessibilityLabel={item.title}
                    >
                      <Text style={styles.secondaryChipText}>{item.title}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </MochiCard>

            {/* TIER 2: Daily Checklist */}
            <View
              onLayout={e => setChecklistY(e.nativeEvent.layout.y)}
              style={styles.checklistHeader}
            >
              <Text style={styles.sectionTitle}>
                Mục tiêu hôm nay 🎯 ({completedChecklistCount}/{checklist.length})
              </Text>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => setIsAddingTodo(!isAddingTodo)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Thêm mục tiêu mới hôm nay"
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
                    Hôm nay bạn chưa có mục tiêu nào. Bấm &quot;+ Thêm mục&quot; để tạo nhé! 🐱✨
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
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: item.is_completed }}
                      accessibilityLabel={item.item_text}
                    >
                      {item.is_completed ? (
                        <CheckCircle2 size={22} color={colors.mintDark} />
                      ) : (
                        <Circle size={22} color={colors.chocolateLight} />
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
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={{ padding: 6 }}
                      accessibilityRole="button"
                      accessibilityLabel={`Xóa mục ${item.item_text}`}
                    >
                      <Trash2 size={15} color={colors.chocolateLight} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </MochiCard>

            {/* TIER 2b: Compact Mochi Daily Brief (if loaded) */}
            {dailyBrief && (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push('/(tabs)/ai')}
                accessibilityRole="button"
                accessibilityLabel="Xem chi tiết Mochi Daily Brief"
              >
                <MochiCard style={styles.briefCompactCard}>
                  <View style={styles.briefCompactHeader}>
                    <Sparkles size={15} color={colors.chocolate} />
                    <Text style={styles.briefCompactTitle}>Mochi Daily Brief</Text>
                    <Text style={styles.briefMore}>Mở Mochi AI →</Text>
                  </View>
                  <Text style={styles.briefCompactText} numberOfLines={2}>
                    {dailyBrief.recommendation || dailyBrief.summary}
                  </Text>
                </MochiCard>
              </TouchableOpacity>
            )}

            {/* TIER 3: Subordinate Quick Stats & XP */}
            <Text style={styles.sectionTitle}>Chỉ số tổng quan 📊</Text>
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
                subtitle={currentBMI ? `BMI: ${currentBMI.toFixed(1)}` : 'Sức khỏe & vận động'}
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
                title="Vận động tuần"
                value={`${weeklyMinutes} phút`}
                subtitle={`${weeklySessions} buổi tuần này`}
                icon="💪"
                accentColor={colors.cheese}
                onPress={() => router.push('/(tabs)/fitness')}
                style={styles.gridItem}
              />
            </View>

            {/* Compact XP Strip */}
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
          </>
        )}
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
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: 8,
  },
  greeting: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.chocolateLight,
  },
  userName: {
    ...typography.titleLarge,
    fontWeight: '900',
    color: colors.chocolate,
  },
  headerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.peachLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  streakPillText: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.peachDark,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.cheese,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    minHeight: 34,
  },
  levelText: {
    ...typography.caption,
    fontWeight: '900',
    color: colors.chocolate,
  },
  skeletonStack: {
    gap: spacing.md,
  },
  skeletonCard: {
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.white,
  },
  heroCard: {
    padding: spacing.lg,
    backgroundColor: '#FFFDF2',
    borderColor: colors.cheese,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  heroCardCompleted: {
    backgroundColor: colors.mintLight,
    borderColor: colors.mint,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  heroContext: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.chocolateLight,
  },
  heroTitle: {
    ...typography.titleMedium,
    fontWeight: '900',
    color: colors.chocolate,
  },
  heroDesc: {
    ...typography.bodySmall,
    color: colors.chocolateLight,
    lineHeight: 19,
  },
  heroCtaBtn: {
    marginTop: spacing.xs,
    borderRadius: radius.full,
  },
  secondaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: spacing.xs,
  },
  secondaryChip: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.chocolateBorder,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
    minHeight: 34,
    justifyContent: 'center',
  },
  secondaryChipText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.chocolate,
  },
  sectionTitle: {
    ...typography.titleSmall,
    fontWeight: '800',
    color: colors.chocolate,
    marginBottom: spacing.sm,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 34,
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
    marginBottom: spacing.lg,
  },
  emptyChecklist: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyChecklistText: {
    ...typography.bodySmall,
    color: colors.chocolateLight,
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
    minHeight: 32,
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
  briefCompactCard: {
    padding: spacing.md,
    backgroundColor: colors.white,
    marginBottom: spacing.lg,
    gap: 6,
  },
  briefCompactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  briefCompactTitle: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.chocolate,
    flex: 1,
  },
  briefMore: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.chocolateLight,
  },
  briefCompactText: {
    ...typography.bodySmall,
    color: colors.chocolateLight,
    lineHeight: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  gridItem: {
    width: '47.5%',
  },
  xpCard: {
    padding: spacing.md,
    backgroundColor: colors.white,
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
    color: colors.chocolateLight,
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
})
