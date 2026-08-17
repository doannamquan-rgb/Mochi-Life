import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/lib/auth-context'
import { MASTER_ACHIEVEMENTS } from '@mochi/shared'
import { MochiCard } from '../src/components/ui/MochiCard'
import { MochiBadge } from '../src/components/ui/MochiBadge'
import { colors, typography, spacing, radius } from '../src/theme/tokens'

export default function AchievementsScreen() {
  const { user } = useAuth()
  const userId = user?.id
  const [activeCategory, setActiveCategory] = useState<'all' | 'fitness' | 'study' | 'expense' | 'general'>('all')

  const { data: unlockedData, isLoading, refetch } = useQuery({
    queryKey: ['user-achievements', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*, achievement:achievements(*)')
        .eq('user_id', userId!)
      if (error) throw error
      return (data || []) as any[]
    },
  })

  const unlockedCodes = new Set((unlockedData || []).map(u => u.achievement?.code || u.achievement_id))

  const filteredMaster = MASTER_ACHIEVEMENTS.filter(a =>
    activeCategory === 'all' ? true : a.category === activeCategory
  )

  const unlockedCount = MASTER_ACHIEVEMENTS.filter(a => unlockedCodes.has(a.code)).length

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} colors={[colors.cheese]} />}
      >
        {/* Total Badge Summary */}
        <MochiCard style={styles.summaryCard}>
          <Text style={styles.mascot}>🏆🐱✨</Text>
          <Text style={styles.summaryTitle}>Huy hiệu Mochi</Text>
          <Text style={styles.summaryCount}>Đã mở khóa: {unlockedCount} / {MASTER_ACHIEVEMENTS.length}</Text>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.round((unlockedCount / MASTER_ACHIEVEMENTS.length) * 100)}%` },
              ]}
            />
          </View>
        </MochiCard>

        {/* Category Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          {[
            { key: 'all', label: 'Tất cả 🌟' },
            { key: 'fitness', label: 'Sức khỏe 💪' },
            { key: 'study', label: 'Học tập 📚' },
            { key: 'expense', label: 'Tài chính 💰' },
            { key: 'general', label: 'Tổng hợp ✨' },
          ].map(c => (
            <TouchableOpacity
              key={c.key}
              style={[styles.catChip, activeCategory === c.key && styles.catChipActive]}
              onPress={() => setActiveCategory(c.key as any)}
            >
              <Text style={[styles.catChipText, activeCategory === c.key && styles.catChipTextActive]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Achievements Grid */}
        <View style={styles.list}>
          {filteredMaster.map(item => {
            const isUnlocked = unlockedCodes.has(item.code)
            return (
              <MochiCard
                key={item.code}
                style={[styles.itemCard, !isUnlocked && styles.itemCardLocked]}
              >
                <View style={styles.itemRow}>
                  <View style={[styles.itemIconBox, isUnlocked ? styles.iconUnlocked : styles.iconLocked]}>
                    <Text style={styles.itemIcon}>{isUnlocked ? item.icon : '🔒'}</Text>
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemName, !isUnlocked && styles.itemNameLocked]}>{item.name}</Text>
                    <Text style={styles.itemDesc}>{item.description}</Text>
                  </View>
                  <MochiBadge
                    label={isUnlocked ? 'Đã mở' : 'Chưa mở'}
                    variant={isUnlocked ? 'cheese' : 'neutral'}
                  />
                </View>
              </MochiCard>
            )
          })}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  summaryCard: {
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.white,
    marginBottom: spacing.lg,
  },
  mascot: {
    fontSize: 44,
    marginBottom: 4,
  },
  summaryTitle: {
    ...typography.titleMedium,
    fontWeight: '900',
    color: colors.chocolate,
  },
  summaryCount: {
    ...typography.bodySmall,
    color: colors.chocolateMuted,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  progressBarBg: {
    height: 8,
    width: '100%',
    backgroundColor: colors.chocolateBorder,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.cheese,
    borderRadius: radius.full,
  },
  catScroll: {
    marginBottom: spacing.lg,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.chocolateBorder,
    backgroundColor: colors.white,
    marginRight: 8,
  },
  catChipActive: {
    backgroundColor: colors.cheeseLight,
    borderColor: colors.cheese,
  },
  catChipText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.chocolateMuted,
  },
  catChipTextActive: {
    color: colors.chocolate,
  },
  list: {
    gap: 10,
  },
  itemCard: {
    padding: spacing.md,
    backgroundColor: colors.white,
  },
  itemCardLocked: {
    opacity: 0.65,
    backgroundColor: colors.chocolateSubtle,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemIconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconUnlocked: {
    backgroundColor: colors.cheeseLight,
  },
  iconLocked: {
    backgroundColor: colors.chocolateBorder,
  },
  itemIcon: {
    fontSize: 22,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    ...typography.bodyMedium,
    fontWeight: '800',
    color: colors.chocolate,
  },
  itemNameLocked: {
    color: colors.chocolateLight,
  },
  itemDesc: {
    ...typography.caption,
    color: colors.chocolateMuted,
    marginTop: 2,
  },
})
