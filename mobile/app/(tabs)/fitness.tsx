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
import { Flame, Activity, ChevronRight } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { useFitness } from '../../src/hooks/useFitness'
import { useMochiReaction } from '../../src/hooks/useMochiReaction'
import {
  MochiCard,
  MochiButton,
  MochiInput,
  MochiBadge,
  StatCard,
  KeyboardSafeModal,
} from '../../src/components/ui'
import {
  getBMICategory,
  EXERCISE_TYPES,
  formatDate,
  formatDuration,
} from '@mochi/shared'
import { colors, typography, spacing, radius } from '../../src/theme/tokens'

export default function FitnessScreen() {
  const router = useRouter()
  const {
    weightGoal,
    exerciseLogs,
    latestWeight,
    heightCm,
    currentBMI,
    weeklyMinutes,
    weeklyCalories,
    weeklySessions,
    todayIntakeCalories,
    weeklyIntakeCalories,
    weeklyCalorieBalance,
    loading,
    addWeightLog,
    addExerciseLog,
    addCalorieIntake,
    refetch,
  } = useFitness()

  const { triggerReaction } = useMochiReaction()
  const [refreshing, setRefreshing] = useState(false)

  // Weight Modal State
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false)
  const [newWeight, setNewWeight] = useState('')
  const [newWaist, setNewWaist] = useState('')
  const [weightNote, setWeightNote] = useState('')
  const [submittingWeight, setSubmittingWeight] = useState(false)

  // Calorie Modal State
  const [isCalorieModalOpen, setIsCalorieModalOpen] = useState(false)
  const [newCalories, setNewCalories] = useState('')
  const [calorieNote, setCalorieNote] = useState('')
  const [submittingCalorie, setSubmittingCalorie] = useState(false)

  // Exercise Modal State
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState('running')
  const [duration, setDuration] = useState('30')
  const [intensity, setIntensity] = useState<'light' | 'moderate' | 'high'>('moderate')
  const [exerciseNote, setExerciseNote] = useState('')
  const [submittingExercise, setSubmittingExercise] = useState(false)

  const onRefresh = async () => {
    setRefreshing(true)
    await refetch()
    setRefreshing(false)
  }

  const handleSaveCalorie = async () => {
    const val = parseInt(newCalories, 10)
    if (!val || val <= 0 || isNaN(val)) {
      Alert.alert('Thông báo', 'Vui lòng nhập lượng calo hợp lệ (> 0 kcal)')
      return
    }

    setSubmittingCalorie(true)
    try {
      await addCalorieIntake({
        calories: val,
        note: calorieNote.trim() || undefined,
      })
      setIsCalorieModalOpen(false)
      setNewCalories('')
      setCalorieNote('')
      Alert.alert('Thành công', 'Đã ghi nhận calo nạp vào! 🥗')
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể lưu calo nạp')
    } finally {
      setSubmittingCalorie(false)
    }
  }

  const bmiInfo = currentBMI ? getBMICategory(currentBMI) : null

  const handleSaveWeight = async () => {
    const val = parseFloat(newWeight.replace(',', '.'))
    if (!val || val <= 0 || isNaN(val)) {
      Alert.alert('Thông báo', 'Vui lòng nhập cân nặng hợp lệ (> 0 kg)')
      return
    }

    setSubmittingWeight(true)
    try {
      await addWeightLog({
        weight: val,
        waist_cm: parseFloat(newWaist.replace(',', '.')) || undefined,
        note: weightNote.trim() || undefined,
      })
      setIsWeightModalOpen(false)
      setNewWeight('')
      setNewWaist('')
      setWeightNote('')

      // Trigger AI reaction
      triggerReaction('weight_logged')
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể lưu cân nặng')
    } finally {
      setSubmittingWeight(false)
    }
  }

  const handleSaveExercise = async () => {
    const dur = parseInt(duration, 10)
    if (!dur || dur <= 0 || isNaN(dur)) {
      Alert.alert('Thông báo', 'Vui lòng nhập thời gian tập luyện (> 0 phút)')
      return
    }

    setSubmittingExercise(true)
    try {
      await addExerciseLog({
        exercise_type: selectedExercise,
        duration_minutes: dur,
        intensity,
        note: exerciseNote.trim() || undefined,
      })
      setIsExerciseModalOpen(false)
      setExerciseNote('')

      // Trigger AI reaction
      triggerReaction('exercise_logged')
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể lưu bài tập')
    } finally {
      setSubmittingExercise(false)
    }
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
          <Text style={styles.title}>Sức khỏe & Tập luyện 💪</Text>
        </View>

        {/* Weight & BMI Card */}
        <MochiCard style={styles.weightCard} accentColor={colors.peach}>
          <View style={styles.weightHeader}>
            <View>
              <Text style={styles.cardSub}>Cân nặng hiện tại</Text>
              <Text style={styles.weightNum}>
                {latestWeight > 0 ? `${latestWeight} kg` : '--'}
              </Text>
            </View>

            {bmiInfo ? (
              <View style={styles.bmiContainer}>
                <Text style={styles.bmiNum}>BMI {currentBMI?.toFixed(1)}</Text>
                <MochiBadge
                  label={bmiInfo.label}
                  color={colors.white}
                  backgroundColor={bmiInfo.color}
                />
              </View>
            ) : (
              <TouchableOpacity
                style={styles.noHeightPrompt}
                onPress={() => router.push('/(tabs)/settings')}
                activeOpacity={0.8}
              >
                <Text style={styles.noHeightText}>
                  {heightCm ? 'BMI chưa sẵn sàng' : 'Chưa có chiều cao'}
                </Text>
                <ChevronRight size={14} color={colors.chocolateMuted} />
              </TouchableOpacity>
            )}
          </View>

          {weightGoal && (
            <View style={styles.goalRow}>
              <Text style={styles.goalText}>Mục tiêu: {weightGoal.target_weight} kg</Text>
              <Text style={styles.goalText}>Bắt đầu: {weightGoal.starting_weight} kg</Text>
            </View>
          )}

          <MochiButton
            title="+ Ghi nhận cân nặng"
            variant="secondary"
            size="sm"
            onPress={() => setIsWeightModalOpen(true)}
            style={{ marginTop: spacing.md }}
          />
        </MochiCard>

        {/* Weekly Stats Grid */}
        <Text style={styles.sectionTitle}>Tập luyện & Dinh dưỡng 🔥</Text>
        <View style={styles.grid}>
          <StatCard
            title="Thời gian tập"
            value={formatDuration(weeklyMinutes)}
            subtitle={`${weeklySessions} buổi tập`}
            icon={<Activity size={20} color={colors.mintDark} />}
            accentColor={colors.mint}
            style={styles.gridItem}
          />
          <StatCard
            title="Calo đốt cháy"
            value={`${weeklyCalories} kcal`}
            subtitle="Ước tính tiêu hao"
            icon={<Flame size={20} color={colors.peachDark} />}
            accentColor={colors.peach}
            style={styles.gridItem}
          />
          <StatCard
            title="Calo nạp vào"
            value={`${todayIntakeCalories} kcal`}
            subtitle={`Tuần: ${weeklyIntakeCalories} kcal`}
            icon={<Text style={{ fontSize: 18 }}>🥗</Text>}
            accentColor={colors.mint}
            style={styles.gridItem}
          />
          <StatCard
            title="Cân bằng calo"
            value={`${weeklyCalorieBalance > 0 ? `+${weeklyCalorieBalance}` : weeklyCalorieBalance} kcal`}
            subtitle="Nạp vào − Tiêu hao"
            icon={<Text style={{ fontSize: 18 }}>⚡</Text>}
            accentColor={colors.cheese}
            style={styles.gridItem}
          />
        </View>

        {/* Log Actions */}
        <View style={styles.logExerciseRow}>
          <Text style={styles.sectionTitle}>Lịch sử luyện tập 🏃</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <MochiButton
              title="+ Calo nạp"
              variant="secondary"
              size="sm"
              onPress={() => setIsCalorieModalOpen(true)}
            />
            <MochiButton
              title="+ Ghi bài tập"
              size="sm"
              onPress={() => setIsExerciseModalOpen(true)}
            />
          </View>
        </View>

        <MochiCard style={styles.listCard}>
          {exerciseLogs.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyMascot}>🐱🏋️</Text>
              <Text style={styles.emptyText}>
                Chưa có buổi tập nào. Bấm '+ Ghi bài tập' để bắt đầu nhé!
              </Text>
            </View>
          ) : (
            exerciseLogs.map(log => {
              const info = EXERCISE_TYPES[log.exercise_type] || {
                label: log.exercise_type,
                icon: '⚡',
              }
              return (
                <View key={log.id} style={styles.logItem}>
                  <View style={styles.logLeft}>
                    <Text style={styles.logIcon}>{info.icon}</Text>
                    <View>
                      <Text style={styles.logTitle}>{info.label}</Text>
                      <Text style={styles.logDate}>
                        {formatDate(log.log_date)} • {log.duration_minutes} phút
                      </Text>
                    </View>
                  </View>
                  <View style={styles.logRight}>
                    <Text style={styles.calText}>+{log.calories_burned || 0} kcal</Text>
                    <MochiBadge
                      label={
                        log.intensity === 'high'
                          ? 'Cao'
                          : log.intensity === 'light'
                          ? 'Nhẹ'
                          : 'Vừa'
                      }
                      variant={
                        log.intensity === 'high'
                          ? 'peach'
                          : log.intensity === 'light'
                          ? 'mint'
                          : 'cheese'
                      }
                    />
                  </View>
                </View>
              )
            })
          )}
        </MochiCard>
      </ScrollView>

      {/* Keyboard-Safe Log Weight Modal */}
      <KeyboardSafeModal
        visible={isWeightModalOpen}
        onClose={() => setIsWeightModalOpen(false)}
      >
        <Text style={styles.modalTitle}>Ghi nhận cân nặng ⚖️</Text>
        <MochiInput
          label="Cân nặng (kg) *"
          placeholder="65.5"
          value={newWeight}
          onChangeText={setNewWeight}
          keyboardType="numeric"
          autoFocus
        />
        <MochiInput
          label="Vòng eo (cm - tùy chọn)"
          placeholder="75"
          value={newWaist}
          onChangeText={setNewWaist}
          keyboardType="numeric"
        />
        <MochiInput
          label="Ghi chú"
          placeholder="Cảm xúc, sau ăn sáng, sau tập..."
          value={weightNote}
          onChangeText={setWeightNote}
        />
        <View style={styles.modalActions}>
          <MochiButton
            title="Hủy"
            variant="ghost"
            onPress={() => setIsWeightModalOpen(false)}
            style={{ flex: 1 }}
          />
          <MochiButton
            title="Lưu lại"
            loading={submittingWeight}
            disabled={submittingWeight}
            onPress={handleSaveWeight}
            style={{ flex: 1.5 }}
          />
        </View>
      </KeyboardSafeModal>

      {/* Keyboard-Safe Log Calorie Modal */}
      <KeyboardSafeModal
        visible={isCalorieModalOpen}
        onClose={() => setIsCalorieModalOpen(false)}
      >
        <Text style={styles.modalTitle}>Ghi nhận calo nạp vào 🥗</Text>
        <MochiInput
          label="Lượng calo (kcal) *"
          placeholder="650"
          value={newCalories}
          onChangeText={setNewCalories}
          keyboardType="numeric"
          autoFocus
        />
        <MochiInput
          label="Ghi chú món ăn (tùy chọn)"
          placeholder="Cơm tấm, phở bò, sinh tố..."
          value={calorieNote}
          onChangeText={setCalorieNote}
        />
        <View style={styles.modalActions}>
          <MochiButton
            title="Hủy"
            variant="ghost"
            onPress={() => setIsCalorieModalOpen(false)}
            style={{ flex: 1 }}
          />
          <MochiButton
            title="Lưu lại"
            loading={submittingCalorie}
            disabled={submittingCalorie}
            onPress={handleSaveCalorie}
            style={{ flex: 1.5 }}
          />
        </View>
      </KeyboardSafeModal>

      {/* Keyboard-Safe Log Exercise Modal */}
      <KeyboardSafeModal
        visible={isExerciseModalOpen}
        onClose={() => setIsExerciseModalOpen(false)}
      >
        <Text style={styles.modalTitle}>Ghi nhận bài tập 🏃</Text>

        <Text style={styles.fieldLabel}>Loại bài tập</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
          {Object.entries(EXERCISE_TYPES).map(([k, v]) => (
            <TouchableOpacity
              key={k}
              style={[styles.pillChip, selectedExercise === k && styles.pillChipActive]}
              onPress={() => setSelectedExercise(k)}
            >
              <Text>{v.icon}</Text>
              <Text
                style={[
                  styles.pillChipText,
                  selectedExercise === k && styles.pillChipTextActive,
                ]}
              >
                {v.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <MochiInput
          label="Thời gian tập (phút) *"
          placeholder="30"
          value={duration}
          onChangeText={setDuration}
          keyboardType="numeric"
        />

        <Text style={styles.fieldLabel}>Cường độ</Text>
        <View style={styles.intensityRow}>
          {(['light', 'moderate', 'high'] as const).map(lvl => (
            <TouchableOpacity
              key={lvl}
              style={[styles.intensityBtn, intensity === lvl && styles.intensityBtnActive]}
              onPress={() => setIntensity(lvl)}
            >
              <Text
                style={[
                  styles.intensityText,
                  intensity === lvl && styles.intensityTextActive,
                ]}
              >
                {lvl === 'light' ? 'Nhẹ' : lvl === 'moderate' ? 'Vừa' : 'Cao'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <MochiInput
          label="Ghi chú"
          placeholder="Cảm giác sau buổi tập, cự ly..."
          value={exerciseNote}
          onChangeText={setExerciseNote}
        />

        <View style={styles.modalActions}>
          <MochiButton
            title="Hủy"
            variant="ghost"
            onPress={() => setIsExerciseModalOpen(false)}
            style={{ flex: 1 }}
          />
          <MochiButton
            title="Lưu bài tập"
            loading={submittingExercise}
            disabled={submittingExercise}
            onPress={handleSaveExercise}
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
    marginBottom: spacing.md,
  },
  title: {
    ...typography.titleLarge,
    fontWeight: '900',
    color: colors.chocolate,
  },
  weightCard: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    marginBottom: spacing.lg,
  },
  weightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardSub: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.chocolateMuted,
  },
  weightNum: {
    ...typography.titleLarge,
    fontSize: 28,
    fontWeight: '900',
    color: colors.chocolate,
    marginTop: 4,
  },
  bmiContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  bmiNum: {
    ...typography.bodyMedium,
    fontWeight: '800',
    color: colors.chocolate,
  },
  noHeightPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.cream,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.chocolateBorder,
  },
  noHeightText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.chocolateMuted,
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.chocolateBorder,
  },
  goalText: {
    ...typography.caption,
    color: colors.chocolateLight,
    fontWeight: '600',
  },
  sectionTitle: {
    ...typography.titleSmall,
    fontWeight: '800',
    color: colors.chocolate,
    marginBottom: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  gridItem: {
    flex: 1,
  },
  logExerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  listCard: {
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
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.chocolateBorder,
  },
  logLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logIcon: {
    fontSize: 22,
  },
  logTitle: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.chocolate,
  },
  logDate: {
    ...typography.caption,
    color: colors.chocolateMuted,
    marginTop: 2,
  },
  logRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  calText: {
    ...typography.bodySmall,
    fontWeight: '800',
    color: colors.peachDark,
  },
  modalTitle: {
    ...typography.titleMedium,
    fontWeight: '900',
    color: colors.chocolate,
    marginBottom: spacing.md,
    marginTop: 4,
  },
  fieldLabel: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.chocolateLight,
    marginBottom: 6,
  },
  pillScroll: {
    marginBottom: spacing.md,
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
  intensityRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md,
  },
  intensityBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.chocolateBorder,
    backgroundColor: colors.cream,
    alignItems: 'center',
  },
  intensityBtnActive: {
    backgroundColor: colors.cheese,
    borderColor: colors.chocolate,
  },
  intensityText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.chocolateLight,
  },
  intensityTextActive: {
    fontWeight: '800',
    color: colors.chocolate,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: spacing.md,
  },
})
