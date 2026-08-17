import React, { useState, useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { useChinese } from '../../src/hooks/useChinese'
import { useMochiReaction } from '../../src/hooks/useMochiReaction'
import { useAuth } from '../../src/lib/auth-context'
import { supabase } from '../../src/lib/supabase'
import { MochiCard } from '../../src/components/ui/MochiCard'
import { MochiButton } from '../../src/components/ui/MochiButton'
import { todayString } from '@mochi/shared'
import type { HskVocabulary } from '@mochi/shared'
import { colors, typography, spacing, radius } from '../../src/theme/tokens'

interface Question {
  vocab: HskVocabulary
  options: string[]
  correctAnswer: string
}

export default function QuizScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { vocabulary } = useChinese()
  const { triggerReaction } = useMochiReaction()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [isAnswered, setIsAnswered] = useState(false)
  const [quizCompleted, setQuizCompleted] = useState(false)

  const questions: Question[] = useMemo(() => {
    if (vocabulary.length < 4) return []
    const shuffled = [...vocabulary].sort(() => 0.5 - Math.random())
    const selected = shuffled.slice(0, Math.min(10, shuffled.length))

    return selected.map(vocab => {
      const distractors = vocabulary
        .filter(v => v.id !== vocab.id)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map(v => v.meaning)

      const options = [...distractors, vocab.meaning].sort(() => 0.5 - Math.random())
      return {
        vocab,
        options,
        correctAnswer: vocab.meaning,
      }
    })
  }, [vocabulary])

  const currentQ = questions[currentIndex]

  const handleSelectOption = (option: string) => {
    if (isAnswered) return
    setSelectedOption(option)
    setIsAnswered(true)

    if (option === currentQ.correctAnswer) {
      setScore(prev => prev + 1)
    }
  }

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setSelectedOption(null)
      setIsAnswered(false)
    } else {
      setQuizCompleted(true)
      triggerReaction('study_session_completed')

      // Record study session and award XP
      if (user?.id) {
        try {
          const today = todayString()
          await supabase.from('study_sessions').insert({
            user_id: user.id,
            session_date: today,
            quiz_score: score,
            duration_minutes: 5,
            is_auto_generated: true,
          })
          await supabase.from('user_xp_logs').insert({
            user_id: user.id,
            amount: 15,
            action_type: 'quiz_completed',
          })
        } catch (e) {
          // Non-blocking
        }
      }
    }
  }

  if (vocabulary.length < 4) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.mascot}>🐱📚</Text>
        <Text style={styles.title}>Cần thêm từ vựng</Text>
        <Text style={styles.subtitle}>Khóa học cần ít nhất 4 từ vựng để bắt đầu trắc nghiệm.</Text>
        <MochiButton title="Quay lại" onPress={() => router.back()} style={{ marginTop: spacing.xl }} />
      </View>
    )
  }

  if (quizCompleted) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.mascot}>🎉🐱</Text>
        <Text style={styles.title}>Hoàn thành bài Quiz!</Text>
        <Text style={styles.scoreText}>Điểm số: {score} / {questions.length}</Text>
        <Text style={styles.subtitle}>
          {score >= 8 ? 'Xuất sắc quá bạn ơi! 🌟' : score >= 5 ? 'Khá lắm, cùng cố gắng nhé! 💪' : 'Ôn tập lại thêm nhé! 🌸'}
        </Text>
        <MochiButton title="Về trang chủ" onPress={() => router.back()} style={{ marginTop: spacing.xl }} />
      </View>
    )
  }

  if (!currentQ) return null

  return (
    <View style={styles.container}>
      {/* Progress */}
      <View style={styles.progressHeader}>
        <Text style={styles.progressText}>
          Câu {currentIndex + 1} / {questions.length} • Điểm: {score}
        </Text>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${Math.round(((currentIndex + 1) / questions.length) * 100)}%` }]} />
        </View>
      </View>

      {/* Question Card */}
      <MochiCard style={styles.questionCard}>
        <Text style={styles.questionHint}>Từ này có nghĩa là gì?</Text>
        <Text style={styles.hanziText}>{currentQ.vocab.hanzi}</Text>
        <Text style={styles.pinyinText}>{currentQ.vocab.pinyin}</Text>
      </MochiCard>

      {/* Options */}
      <View style={styles.optionsList}>
        {currentQ.options.map((opt, idx) => {
          let btnStyle: any = styles.optionBtn
          let textStyle: any = styles.optionText

          if (isAnswered) {
            if (opt === currentQ.correctAnswer) {
              btnStyle = [styles.optionBtn, styles.optionCorrect]
              textStyle = [styles.optionText, styles.optionTextCorrect]
            } else if (opt === selectedOption) {
              btnStyle = [styles.optionBtn, styles.optionWrong]
              textStyle = [styles.optionText, styles.optionTextWrong]
            }
          }

          return (
            <TouchableOpacity
              key={idx}
              style={btnStyle}
              activeOpacity={0.8}
              onPress={() => handleSelectOption(opt)}
            >
              <Text style={textStyle}>{opt}</Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Next Button */}
      {isAnswered && (
        <MochiButton
          title={currentIndex < questions.length - 1 ? 'Câu tiếp theo →' : 'Xem kết quả 🎉'}
          size="lg"
          onPress={handleNext}
          style={{ marginTop: spacing.lg }}
        />
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
  title: {
    ...typography.titleMedium,
    fontWeight: '900',
    color: colors.chocolate,
  },
  scoreText: {
    ...typography.titleLarge,
    fontWeight: '900',
    color: colors.cheeseHover,
    marginVertical: 6,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.chocolateMuted,
    textAlign: 'center',
  },
  progressHeader: {
    marginBottom: spacing.md,
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
    backgroundColor: colors.cheese,
    borderRadius: radius.full,
  },
  questionCard: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.white,
    marginBottom: spacing.lg,
  },
  questionHint: {
    ...typography.caption,
    color: colors.chocolateMuted,
    marginBottom: 8,
  },
  hanziText: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.chocolate,
  },
  pinyinText: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.lavenderDark,
    marginTop: 4,
  },
  optionsList: {
    gap: 10,
  },
  optionBtn: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.chocolateBorder,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  optionCorrect: {
    backgroundColor: colors.mintLight,
    borderColor: colors.mint,
  },
  optionWrong: {
    backgroundColor: colors.peachLight,
    borderColor: colors.peach,
  },
  optionText: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: colors.chocolate,
    textAlign: 'center',
  },
  optionTextCorrect: {
    color: colors.mintDark,
  },
  optionTextWrong: {
    color: colors.peachDark,
  },
})
