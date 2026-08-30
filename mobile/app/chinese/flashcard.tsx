import React, { useState, useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useChinese } from '../../src/hooks/useChinese'
import { useMochiReaction } from '../../src/hooks/useMochiReaction'
import { MochiCard } from '../../src/components/ui/MochiCard'
import { MochiButton } from '../../src/components/ui/MochiButton'
import type { ReviewRating } from '@mochi/shared'
import { calculateNextReview, formatInterval } from '@mochi/shared'
import { colors, typography, spacing, radius } from '../../src/theme/tokens'

export default function FlashcardScreen() {
  const router = useRouter()
  const { vocabulary, dueVocab, submitReview } = useChinese()
  const { triggerReaction } = useMochiReaction()
  const studyList = dueVocab.length > 0 ? dueVocab : vocabulary

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [sessionReviewed, setSessionReviewed] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const currentWord = studyList[currentIndex]

  // Pre-compute real SM-2 intervals for current word so button labels are accurate
  const intervalPreviews = useMemo(() => {
    if (!currentWord) return { forgot: '1 ngày', hard: '1 ngày', remembered: '3 ngày', easy: '7 ngày' }
    const state = {
      interval_days: currentWord.sr_interval_days || 0,
      ease_factor: currentWord.sr_ease_factor || 2.5,
      repetitions: currentWord.sr_repetitions || 0,
      next_review_at: new Date(currentWord.next_review_at || new Date()),
    }
    const ratings: ReviewRating[] = ['forgot', 'hard', 'remembered', 'easy']
    return Object.fromEntries(
      ratings.map(r => [r, formatInterval(calculateNextReview(state, r).interval_days)])
    ) as Record<ReviewRating, string>
  }, [currentWord])

  const handleRating = async (rating: ReviewRating) => {
    if (!currentWord || submitting) return
    setSubmitting(true)

    try {
      await submitReview({ vocab: currentWord, rating })
      setSessionReviewed(prev => prev + 1)
      setIsFlipped(false)

      if (currentIndex < studyList.length - 1) {
        setCurrentIndex(prev => prev + 1)
      } else {
        triggerReaction('review_session_completed')
        Alert.alert(
          'Hoàn thành buổi ôn tập! 🎉',
          `Bạn đã ôn tập xong ${sessionReviewed + 1} từ vựng hôm nay!`,
          [{ text: 'Về trang chủ', onPress: () => router.back() }]
        )
      }
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể lưu kết quả')
    } finally {
      setSubmitting(false)
    }
  }

  if (!currentWord || studyList.length === 0) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.mascot}>🐱🎉</Text>
        <Text style={styles.completedTitle}>Không có từ nào cần ôn!</Text>
        <Text style={styles.completedSub}>Bạn đã hoàn thành tất cả các mục tiêu ôn tập rồi.</Text>
        <MochiButton title="Quay lại" onPress={() => router.back()} style={{ marginTop: spacing.xl }} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressHeader}>
        <Text style={styles.progressText}>
          Từ {currentIndex + 1} / {studyList.length}
        </Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${Math.round(((currentIndex + 1) / studyList.length) * 100)}%` }]} />
        </View>
      </View>

      {/* Flashcard Component */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setIsFlipped(!isFlipped)}
        style={styles.cardContainer}
      >
        <MochiCard style={styles.flashcard}>
          <Text style={styles.flipHint}>{isFlipped ? 'Chạm để xem chữ Hán' : 'Chạm để xem nghĩa'}</Text>
          
          <Text style={styles.hanziText}>{currentWord.hanzi}</Text>

          {isFlipped ? (
            <View style={styles.flippedContent}>
              <Text style={styles.pinyinText}>{currentWord.pinyin}</Text>
              <Text style={styles.meaningText}>{currentWord.meaning}</Text>
              {currentWord.example_cn && (
                <View style={styles.exampleBox}>
                  <Text style={styles.exampleCn}>{currentWord.example_cn}</Text>
                  <Text style={styles.exampleVi}>{currentWord.example_vi}</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.unflippedPlaceholder}>
              <Text style={styles.questionMark}>❓</Text>
            </View>
          )}
        </MochiCard>
      </TouchableOpacity>

      {/* SM-2 Rating Buttons */}
      {isFlipped ? (
        <View style={styles.ratingBar}>
          <TouchableOpacity
            style={[styles.rateBtn, { backgroundColor: colors.peachLight, borderColor: colors.peach }]}
            onPress={() => handleRating('forgot')}
            disabled={submitting}
          >
            <Text style={[styles.rateBtnTitle, { color: colors.peachDark }]}>Quên 😿</Text>
            <Text style={styles.rateBtnSub}>{intervalPreviews.forgot}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rateBtn, { backgroundColor: colors.cheeseLight, borderColor: colors.cheese }]}
            onPress={() => handleRating('hard')}
            disabled={submitting}
          >
            <Text style={[styles.rateBtnTitle, { color: colors.chocolate }]}>Khó 😕</Text>
            <Text style={styles.rateBtnSub}>{intervalPreviews.hard}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rateBtn, { backgroundColor: colors.mintLight, borderColor: colors.mint }]}
            onPress={() => handleRating('remembered')}
            disabled={submitting}
          >
            <Text style={[styles.rateBtnTitle, { color: colors.mintDark }]}>Nhớ 😊</Text>
            <Text style={styles.rateBtnSub}>{intervalPreviews.remembered}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rateBtn, { backgroundColor: colors.lavenderLight, borderColor: colors.lavender }]}
            onPress={() => handleRating('easy')}
            disabled={submitting}
          >
            <Text style={[styles.rateBtnTitle, { color: colors.lavenderDark }]}>Dễ 🐱✨</Text>
            <Text style={styles.rateBtnSub}>{intervalPreviews.easy}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.tapPrompt}>
          <Text style={styles.tapPromptText}>👆 Chạm vào thẻ để kiểm tra câu trả lời</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
    padding: spacing.lg,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  mascot: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  completedTitle: {
    ...typography.titleMedium,
    fontWeight: '900',
    color: colors.chocolate,
  },
  completedSub: {
    ...typography.bodySmall,
    color: colors.chocolateMuted,
    marginTop: 4,
  },
  progressHeader: {
    marginBottom: spacing.lg,
  },
  progressText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.chocolateMuted,
    marginBottom: 6,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.chocolateBorder,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.lavender,
    borderRadius: radius.full,
  },
  cardContainer: {
    flex: 1,
    marginBottom: spacing.lg,
  },
  flashcard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.white,
  },
  flipHint: {
    ...typography.caption,
    color: colors.chocolateMuted,
    position: 'absolute',
    top: 16,
  },
  hanziText: {
    fontSize: 54,
    fontWeight: '900',
    color: colors.chocolate,
    marginBottom: spacing.md,
  },
  flippedContent: {
    alignItems: 'center',
    width: '100%',
  },
  pinyinText: {
    ...typography.titleMedium,
    color: colors.lavenderDark,
    fontWeight: '800',
    marginBottom: 6,
  },
  meaningText: {
    ...typography.bodyLarge,
    color: colors.chocolate,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  exampleBox: {
    backgroundColor: colors.chocolateSubtle,
    padding: 12,
    borderRadius: radius.md,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.chocolateBorder,
  },
  exampleCn: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.chocolate,
    marginBottom: 2,
  },
  exampleVi: {
    ...typography.caption,
    color: colors.chocolateMuted,
  },
  unflippedPlaceholder: {
    paddingVertical: 20,
  },
  questionMark: {
    fontSize: 36,
  },
  ratingBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  rateBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  rateBtnTitle: {
    ...typography.bodySmall,
    fontWeight: '800',
  },
  rateBtnSub: {
    ...typography.caption,
    fontSize: 10,
    color: colors.chocolateMuted,
    marginTop: 2,
  },
  tapPrompt: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  tapPromptText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.chocolateMuted,
  },
})
