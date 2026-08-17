import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { CheckCircle2, Circle, Flame, Sparkles, Trophy, Plus } from 'lucide-react-native'
import { useDashboardData } from '../../src/hooks/useDashboardData'
import { useFinance } from '../../src/hooks/useFinance'
import { useFitness } from '../../src/hooks/useFitness'
import { useChinese } from '../../src/hooks/useChinese'
import { MochiCard } from '../../src/components/ui/MochiCard'
import { StatCard } from '../../src/components/ui/StatCard'
import { MochiBadge } from '../../src/components/ui/MochiBadge'
import { MochiButton } from '../../src/components/ui/MochiButton'
import { MochiInput } from '../../src/components/ui/MochiInput'
import { formatVNDCompact, getGreeting } from '@mochi/shared'
import { colors, typography, spacing, radius } from '../../src/theme/tokens'

export default function DashboardScreen() {
  const router = useRouter()
  const { profile, levelData, checklist, streak, loading, toggleChecklist, addChecklistItem, refetch } = useDashboardData()
  const { totalBalance, monthExpense } = useFinance()
  const { latestWeight, currentBMI, weeklyMinutes } = useFitness()
  const { dueCount, learnedCount } = useChinese()

  const [refreshing, setRefreshing] = useState(false)
  const [newTodoText, setNewTodoText] = useState('')
  const [isAddingTodo, setIsAddingTodo] = useState(false)

  const onRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  const handleAddTodo = async () => {
    if (!newTodoText.trim()) return
    await addChecklistItem({ item_text: newTodoText.trim(), category: 'other' })
    setNewTodoText('')
    setIsAddingTodo(false)
  }

  const greeting = getGreeting()
  const displayName = profile?.display_name || 'Bạn Mochi'

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing || loading} onRefresh={onRefresh} colors={[colors.cheese]} />}
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
            <View style={[styles.progressBarFill, { width: `${levelData?.progressPct || 0}%` }]} />
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
            subtitle={currentBMI ? `BMI: ${currentBMI.toFixed(1)}` : 'Chưa có'}
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
          >
            <Plus size={18} color={colors.chocolate} />
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
                onPress={handleAddTodo}
              />
            </View>
          </MochiCard>
        )}

        <MochiCard style={styles.checklistCard}>
          {checklist.length === 0 ? (
            <View style={styles.emptyChecklist}>
              <Text style={styles.emptyMascot}>🐱📝</Text>
              <Text style={styles.emptyText}>Chưa có mục tiêu nào hôm nay. Bấm 'Thêm mục' để tạo nhé!</Text>
            </View>
          ) : (
            checklist.map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.checklistItem}
                activeOpacity={0.7}
                onPress={() => toggleChecklist({ id: item.id, is_completed: !item.is_completed })}
              >
                {item.is_completed ? (
                  <CheckCircle2 size={22} color={colors.mint} />
                ) : (
                  <Circle size={22} color={colors.chocolateMuted} />
                )}
                <Text
                  style={[
                    styles.itemText,
                    item.is_completed && styles.itemTextCompleted,
                  ]}
                >
                  {item.item_text}
                </Text>
                {item.category && item.category !== 'other' && (
                  <MochiBadge
                    label={item.category === 'fitness' ? 'Sức khỏe' : item.category === 'study' ? 'Học tập' : 'Tài chính'}
                    variant={item.category === 'fitness' ? 'peach' : item.category === 'study' ? 'lavender' : 'mint'}
                  />
                )}
              </TouchableOpacity>
            ))
          )}
        </MochiCard>

        {/* AI Assistant Quick Banner */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push('/(tabs)/ai')}
          style={styles.aiBanner}
        >
          <View style={styles.aiBannerContent}>
            <Sparkles size={24} color={colors.chocolate} />
            <View style={{ flex: 1 }}>
              <Text style={styles.aiBannerTitle}>Hỏi Mochi AI ✨</Text>
              <Text style={styles.aiBannerSubtitle}>Nhận lời khuyên thông minh và tóm tắt ngày</Text>
            </View>
          </View>
        </TouchableOpacity>
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
    ...typography.bodySmall,
    color: colors.chocolateMuted,
    fontWeight: '600',
  },
  userName: {
    ...typography.titleLarge,
    color: colors.chocolate,
    fontWeight: '900',
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cheeseLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.cheese,
    gap: 4,
  },
  levelText: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.chocolate,
  },
  xpCard: {
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  xpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  xpLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.chocolate,
  },
  xpValue: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.chocolateMuted,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.chocolateBorder,
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
    color: colors.chocolate,
    fontWeight: '800',
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: spacing.xl,
  },
  gridItem: {
    width: '48%',
  },
  checklistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  addBtnText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.chocolate,
  },
  addTodoCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  checklistCard: {
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.chocolateBorder,
    gap: 10,
  },
  itemText: {
    flex: 1,
    ...typography.bodyMedium,
    color: colors.chocolate,
    fontWeight: '600',
  },
  itemTextCompleted: {
    textDecorationLine: 'line-through',
    color: colors.chocolateMuted,
  },
  emptyChecklist: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyMascot: {
    fontSize: 32,
    marginBottom: 6,
  },
  emptyText: {
    ...typography.bodySmall,
    color: colors.chocolateMuted,
    textAlign: 'center',
  },
  aiBanner: {
    backgroundColor: colors.cheeseLight,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.cheese,
  },
  aiBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiBannerTitle: {
    ...typography.bodyMedium,
    fontWeight: '800',
    color: colors.chocolate,
  },
  aiBannerSubtitle: {
    ...typography.caption,
    color: colors.chocolateLight,
  },
})
