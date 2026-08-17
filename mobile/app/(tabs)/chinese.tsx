import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Layers, HelpCircle } from 'lucide-react-native'
import { useChinese } from '../../src/hooks/useChinese'
import { MochiCard } from '../../src/components/ui/MochiCard'
import { MochiBadge } from '../../src/components/ui/MochiBadge'
import { StatCard } from '../../src/components/ui/StatCard'
import { colors, typography, spacing, radius } from '../../src/theme/tokens'

export default function ChineseScreen() {
  const router = useRouter()
  const { activeCourse, vocabulary, totalCount, learnedCount, masteredCount, dueCount, loading, refetch } = useChinese()
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  const progressPct = totalCount > 0 ? Math.round((learnedCount / totalCount) * 100) : 0

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing || loading} onRefresh={onRefresh} colors={[colors.cheese]} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Học tiếng Trung 🈶</Text>
        </View>

        {/* Active Course Card */}
        <MochiCard style={styles.courseCard}>
          <View style={styles.courseHeader}>
            <Text style={styles.courseLevelBadge}>{activeCourse?.level || 'HSK 1'}</Text>
            <Text style={styles.courseTitle}>{activeCourse?.name || 'Khóa học HSK'}</Text>
          </View>
          <Text style={styles.courseProgressSub}>Tiến độ: {learnedCount}/{totalCount} từ vựng ({progressPct}%)</Text>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
        </MochiCard>

        {/* Study Mode Launchers */}
        <Text style={styles.sectionTitle}>Chế độ học tập 🚀</Text>
        <View style={styles.modesRow}>
          <TouchableOpacity
            style={[styles.modeCard, { backgroundColor: colors.lavenderLight, borderColor: colors.lavender }]}
            activeOpacity={0.8}
            onPress={() => router.push('/chinese/flashcard')}
          >
            <Layers size={28} color={colors.lavenderDark} />
            <Text style={styles.modeTitle}>Flashcard SRS</Text>
            <Text style={styles.modeSub}>{dueCount > 0 ? `Cần ôn: ${dueCount} từ` : 'Đã hoàn thành ôn'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeCard, { backgroundColor: colors.cheeseLight, borderColor: colors.cheese }]}
            activeOpacity={0.8}
            onPress={() => router.push('/chinese/quiz')}
          >
            <HelpCircle size={28} color={colors.chocolate} />
            <Text style={styles.modeTitle}>Trắc nghiệm</Text>
            <Text style={styles.modeSub}>Kiểm tra ghi nhớ</Text>
          </TouchableOpacity>
        </View>

        {/* Vocabulary Metrics */}
        <Text style={styles.sectionTitle}>Thống kê từ vựng 📊</Text>
        <View style={styles.grid}>
          <StatCard
            title="Từ cần ôn"
            value={`${dueCount}`}
            subtitle="Hôm nay"
            icon="⏰"
            accentColor={colors.peach}
            style={styles.gridItem}
          />
          <StatCard
            title="Đã thành thạo"
            value={`${masteredCount}`}
            subtitle="Trí nhớ dài hạn"
            icon="⭐"
            accentColor={colors.cheese}
            style={styles.gridItem}
          />
        </View>

        {/* Vocabulary List Preview */}
        <View style={styles.vocabHeader}>
          <Text style={styles.sectionTitle}>Danh sách từ vựng 📚</Text>
          <Text style={styles.vocabCountText}>{totalCount} từ</Text>
        </View>

        <MochiCard style={styles.vocabListCard}>
          {vocabulary.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyMascot}>🐱📖</Text>
              <Text style={styles.emptyText}>Chưa có từ vựng nào trong khóa học này.</Text>
            </View>
          ) : (
            vocabulary.slice(0, 30).map(v => (
              <View key={v.id} style={styles.vocabItem}>
                <View style={styles.vocabLeft}>
                  <Text style={styles.hanzi}>{v.hanzi}</Text>
                  <View>
                    <Text style={styles.pinyin}>{v.pinyin}</Text>
                    <Text style={styles.meaning}>{v.meaning}</Text>
                  </View>
                </View>
                <MochiBadge
                  label={v.memory_level === 'mastered' ? 'Thuộc' : v.memory_level === 'learned' ? 'Đã nhớ' : v.memory_level === 'hard' ? 'Khó' : 'Chưa học'}
                  variant={v.memory_level === 'mastered' ? 'cheese' : v.memory_level === 'learned' ? 'mint' : v.memory_level === 'hard' ? 'peach' : 'neutral'}
                />
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
    marginBottom: spacing.md,
  },
  title: {
    ...typography.titleLarge,
    fontWeight: '900',
    color: colors.chocolate,
  },
  courseCard: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    marginBottom: spacing.lg,
  },
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  courseLevelBadge: {
    ...typography.caption,
    fontWeight: '900',
    backgroundColor: colors.lavenderLight,
    color: colors.lavenderDark,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.md,
  },
  courseTitle: {
    ...typography.titleSmall,
    fontWeight: '800',
    color: colors.chocolate,
  },
  courseProgressSub: {
    ...typography.caption,
    color: colors.chocolateMuted,
    marginTop: 4,
    marginBottom: 8,
  },
  progressBg: {
    height: 8,
    backgroundColor: colors.chocolateBorder,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.lavender,
    borderRadius: radius.full,
  },
  sectionTitle: {
    ...typography.titleSmall,
    color: colors.chocolate,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  modesRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: spacing.lg,
  },
  modeCard: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTitle: {
    ...typography.bodyMedium,
    fontWeight: '800',
    color: colors.chocolate,
    marginTop: 8,
  },
  modeSub: {
    ...typography.caption,
    color: colors.chocolateLight,
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: spacing.lg,
  },
  gridItem: {
    flex: 1,
  },
  vocabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  vocabCountText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.chocolateMuted,
  },
  vocabListCard: {
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
  vocabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.chocolateBorder,
  },
  vocabLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  hanzi: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.chocolate,
    minWidth: 44,
  },
  pinyin: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.lavenderDark,
  },
  meaning: {
    ...typography.caption,
    color: colors.chocolateLight,
  },
})
