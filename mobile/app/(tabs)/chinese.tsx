import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import {
  Layers,
  HelpCircle,
  ChevronDown,
  Check,
  Search,
  BookOpen,
} from 'lucide-react-native'
import { useChinese } from '../../src/hooks/useChinese'
import {
  MochiCard,
  MochiBadge,
  StatCard,
  KeyboardSafeModal,
  MochiButton,
} from '../../src/components/ui'
import { colors, typography, spacing, radius } from '../../src/theme/tokens'

export default function ChineseScreen() {
  const router = useRouter()
  const {
    courses,
    activeCourse,
    vocabulary,
    totalCount,
    learnedCount,
    masteredCount,
    dueCount,
    loading,
    switchCourse,
    refetch,
  } = useChinese()

  const [refreshing, setRefreshing] = useState(false)
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [switching, setSwitching] = useState(false)

  const onRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  const handleSelectCourse = async (courseId: string) => {
    if (courseId === activeCourse?.id) {
      setIsCourseModalOpen(false)
      return
    }

    setSwitching(true)
    try {
      await switchCourse(courseId)
      setIsCourseModalOpen(false)
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể chuyển khóa học')
    } finally {
      setSwitching(false)
    }
  }

  const progressPct = totalCount > 0 ? Math.min(100, Math.round((learnedCount / totalCount) * 100)) : 0

  const filteredVocabulary = vocabulary.filter(v => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    return (
      v.hanzi.toLowerCase().includes(q) ||
      v.pinyin.toLowerCase().includes(q) ||
      v.meaning.toLowerCase().includes(q)
    )
  })

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
        {/* Header with Course Selector */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Học tiếng Trung 🈶</Text>
            <Text style={styles.subtitle}>Phương pháp Spaced Repetition (SM-2)</Text>
          </View>

          <TouchableOpacity
            style={styles.courseSwitchBtn}
            onPress={() => setIsCourseModalOpen(true)}
            activeOpacity={0.8}
          >
            <BookOpen size={16} color={colors.chocolate} />
            <Text style={styles.courseSwitchText}>
              {activeCourse?.level || activeCourse?.name || 'Chọn khóa'}
            </Text>
            <ChevronDown size={14} color={colors.chocolate} />
          </TouchableOpacity>
        </View>

        {/* Active Course Card */}
        <MochiCard style={styles.courseCard} accentColor={colors.lavender}>
          <View style={styles.courseHeader}>
            <View style={styles.badgeWrapper}>
              <Text style={styles.courseLevelBadge}>{activeCourse?.level || 'HSK'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.courseTitle}>
                {activeCourse?.name || 'Chưa chọn khóa học'}
              </Text>
              <Text style={styles.courseSub}>
                {totalCount} từ vựng • Spaced Repetition
              </Text>
            </View>
          </View>

          <View style={styles.progressRow}>
            <Text style={styles.courseProgressSub}>
              Đã học: {learnedCount}/{totalCount} từ
            </Text>
            <Text style={styles.progressPctText}>{progressPct}%</Text>
          </View>

          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
        </MochiCard>

        {/* Study Mode Launchers */}
        <Text style={styles.sectionTitle}>Chế độ học tập 🚀</Text>
        <View style={styles.modesRow}>
          <TouchableOpacity
            style={[
              styles.modeCard,
              { backgroundColor: colors.lavenderLight, borderColor: colors.lavender },
            ]}
            activeOpacity={0.8}
            onPress={() => router.push('/chinese/flashcard')}
          >
            <Layers size={28} color={colors.lavenderDark} />
            <Text style={styles.modeTitle}>Flashcard SRS</Text>
            <Text style={styles.modeSub}>
              {dueCount > 0 ? `Cần ôn: ${dueCount} từ` : 'Đã hoàn thành ôn tập 🎉'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeCard,
              { backgroundColor: colors.cheeseLight, borderColor: colors.cheese },
            ]}
            activeOpacity={0.8}
            onPress={() => router.push('/chinese/quiz')}
          >
            <HelpCircle size={28} color={colors.chocolate} />
            <Text style={styles.modeTitle}>Trắc nghiệm</Text>
            <Text style={styles.modeSub}>Kiểm tra 4 đáp án</Text>
          </TouchableOpacity>
        </View>

        {/* Vocabulary Metrics */}
        <Text style={styles.sectionTitle}>Thống kê từ vựng 📊</Text>
        <View style={styles.grid}>
          <StatCard
            title="Từ cần ôn"
            value={`${dueCount}`}
            subtitle="Đến hạn hôm nay"
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

        {/* Search & Vocabulary List */}
        <View style={styles.vocabHeader}>
          <Text style={styles.sectionTitle}>Danh sách từ vựng 📚</Text>
          <Text style={styles.vocabCountText}>
            {filteredVocabulary.length}/{totalCount} từ
          </Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Search size={16} color={colors.chocolateMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo chữ Hán, pinyin, tiếng Việt..."
            placeholderTextColor={colors.chocolateMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>

        <MochiCard style={styles.vocabListCard}>
          {filteredVocabulary.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyMascot}>🐱📖</Text>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? 'Không tìm thấy từ vựng phù hợp'
                  : 'Chưa có từ vựng nào trong khóa học này.'}
              </Text>
            </View>
          ) : (
            filteredVocabulary.slice(0, 60).map(v => (
              <View key={v.id} style={styles.vocabItem}>
                <View style={styles.vocabLeft}>
                  <Text style={styles.hanzi}>{v.hanzi}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pinyin}>{v.pinyin}</Text>
                    <Text style={styles.meaning} numberOfLines={2}>
                      {v.meaning}
                    </Text>
                  </View>
                </View>
                <MochiBadge
                  label={
                    v.memory_level === 'mastered'
                      ? 'Thuộc'
                      : v.memory_level === 'learned'
                      ? 'Đã nhớ'
                      : v.memory_level === 'hard'
                      ? 'Khó'
                      : 'Chưa học'
                  }
                  variant={
                    v.memory_level === 'mastered'
                      ? 'cheese'
                      : v.memory_level === 'learned'
                      ? 'mint'
                      : v.memory_level === 'hard'
                      ? 'peach'
                      : 'neutral'
                  }
                />
              </View>
            ))
          )}
          {filteredVocabulary.length > 60 && (
            <View style={styles.vocabCapNote}>
              <Text style={styles.vocabCapText}>
                Đang hiển thị 60/{filteredVocabulary.length} từ — dùng tìm kiếm để lọc 🔍
              </Text>
            </View>
          )}
        </MochiCard>
      </ScrollView>

      {/* Course Switcher Bottom Sheet Modal */}
      <KeyboardSafeModal
        visible={isCourseModalOpen}
        onClose={() => setIsCourseModalOpen(false)}
      >
        <Text style={styles.modalTitle}>Chọn khóa học tiếng Trung 🈶</Text>
        <Text style={styles.modalSubtitle}>
          Dữ liệu tiến độ và từ vựng sẽ được đồng bộ ngay lập tức.
        </Text>

        <View style={styles.courseOptionsList}>
          {courses.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Chưa có khóa học nào trên tài khoản của bạn.</Text>
            </View>
          ) : (
            courses.map(c => {
              const isSelected = c.id === activeCourse?.id
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.courseOptionItem,
                    isSelected && styles.courseOptionItemSelected,
                  ]}
                  onPress={() => handleSelectCourse(c.id)}
                  disabled={switching}
                >
                  <View style={styles.courseOptionLeft}>
                    <View
                      style={[
                        styles.courseOptionBadge,
                        isSelected && { backgroundColor: colors.cheese },
                      ]}
                    >
                      <Text style={styles.courseOptionLevel}>{c.level || 'HSK'}</Text>
                    </View>
                    <View>
                      <Text style={styles.courseOptionName}>{c.name}</Text>
                      <Text style={styles.courseOptionCount}>
                        {c.total_vocabulary || 0} từ vựng
                      </Text>
                    </View>
                  </View>
                  {isSelected && <Check size={20} color={colors.chocolate} />}
                </TouchableOpacity>
              )
            })
          )}
        </View>

        <MochiButton
          title="Đóng"
          variant="ghost"
          onPress={() => setIsCourseModalOpen(false)}
          style={{ marginTop: spacing.md }}
        />
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
  subtitle: {
    ...typography.caption,
    color: colors.chocolateMuted,
    marginTop: 2,
  },
  courseSwitchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.cheese,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  courseSwitchText: {
    ...typography.caption,
    fontWeight: '800',
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
    gap: 12,
    marginBottom: spacing.md,
  },
  badgeWrapper: {
    backgroundColor: colors.lavenderLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lavender,
  },
  courseLevelBadge: {
    ...typography.bodySmall,
    fontWeight: '800',
    color: colors.lavenderDark,
  },
  courseTitle: {
    ...typography.titleSmall,
    fontWeight: '800',
    color: colors.chocolate,
  },
  courseSub: {
    ...typography.caption,
    color: colors.chocolateMuted,
    marginTop: 2,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  courseProgressSub: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.chocolateLight,
  },
  progressPctText: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.lavenderDark,
  },
  progressBg: {
    height: 10,
    backgroundColor: colors.cream,
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
    fontWeight: '800',
    color: colors.chocolate,
    marginBottom: spacing.sm,
  },
  modesRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  modeCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    gap: 6,
  },
  modeTitle: {
    ...typography.bodyMedium,
    fontWeight: '800',
    color: colors.chocolate,
  },
  modeSub: {
    ...typography.caption,
    color: colors.chocolateLight,
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  gridItem: {
    flex: 1,
  },
  vocabHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  vocabCountText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.chocolateMuted,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.chocolateBorder,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    ...typography.bodySmall,
    color: colors.chocolate,
    padding: 0,
  },
  vocabListCard: {
    padding: 0,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
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
  vocabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.chocolateBorder,
  },
  vocabLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  hanzi: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.chocolate,
    minWidth: 44,
  },
  pinyin: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.peachDark,
  },
  meaning: {
    ...typography.bodySmall,
    color: colors.chocolateLight,
    marginTop: 2,
  },
  modalTitle: {
    ...typography.titleMedium,
    fontWeight: '900',
    color: colors.chocolate,
    marginBottom: 4,
    marginTop: 4,
  },
  modalSubtitle: {
    ...typography.bodySmall,
    color: colors.chocolateMuted,
    marginBottom: spacing.md,
  },
  courseOptionsList: {
    gap: 8,
  },
  courseOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.chocolateBorder,
    backgroundColor: colors.white,
  },
  courseOptionItemSelected: {
    borderColor: colors.cheese,
    backgroundColor: colors.cheeseLight,
  },
  courseOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  courseOptionBadge: {
    backgroundColor: colors.cream,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  courseOptionLevel: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.chocolate,
  },
  courseOptionName: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.chocolate,
  },
  courseOptionCount: {
    ...typography.caption,
    color: colors.chocolateMuted,
  },
  vocabCapNote: {
    padding: spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.chocolateBorder,
  },
  vocabCapText: {
    ...typography.caption,
    color: colors.chocolateMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
})
