import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Modal, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Flame, Activity } from 'lucide-react-native'
import { useFitness } from '../../src/hooks/useFitness'
import { MochiCard } from '../../src/components/ui/MochiCard'
import { MochiButton } from '../../src/components/ui/MochiButton'
import { MochiInput } from '../../src/components/ui/MochiInput'
import { MochiBadge } from '../../src/components/ui/MochiBadge'
import { StatCard } from '../../src/components/ui/StatCard'
import { getBMICategory, EXERCISE_TYPES, formatDate, formatDuration } from '@mochi/shared'
import { colors, typography, spacing, radius } from '../../src/theme/tokens'

export default function FitnessScreen() {
  const { weightGoal, exerciseLogs, latestWeight, currentBMI, weeklyMinutes, weeklyCalories, weeklySessions, loading, addWeightLog, addExerciseLog, refetch } = useFitness()
  const [refreshing, setRefreshing] = useState(false)

  // Weight Modal State
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false)
  const [newWeight, setNewWeight] = useState('')
  const [newWaist, setNewWaist] = useState('')
  const [weightNote, setWeightNote] = useState('')
  const [submittingWeight, setSubmittingWeight] = useState(false)

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

  const bmiInfo = currentBMI ? getBMICategory(currentBMI) : null

  const handleSaveWeight = async () => {
    const val = parseFloat(newWeight)
    if (!val || val <= 0) {
      Alert.alert('Thông báo', 'Vui lòng nhập cân nặng hợp lệ')
      return
    }

    setSubmittingWeight(true)
    try {
      await addWeightLog({
        weight: val,
        waist_cm: parseFloat(newWaist) || undefined,
        note: weightNote.trim() || undefined,
      })
      setIsWeightModalOpen(false)
      setNewWeight('')
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể lưu cân nặng')
    } finally {
      setSubmittingWeight(false)
    }
  }

  const handleSaveExercise = async () => {
    const dur = parseInt(duration)
    if (!dur || dur <= 0) {
      Alert.alert('Thông báo', 'Vui lòng nhập thời gian tập luyện')
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
        refreshControl={<RefreshControl refreshing={refreshing || loading} onRefresh={onRefresh} colors={[colors.cheese]} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Sức khỏe & Tập luyện 💪</Text>
        </View>

        {/* Weight & BMI Card */}
        <MochiCard style={styles.weightCard}>
          <View style={styles.weightHeader}>
            <View>
              <Text style={styles.cardSub}>Cân nặng hiện tại</Text>
              <Text style={styles.weightNum}>{latestWeight > 0 ? `${latestWeight} kg` : '--'}</Text>
            </View>
            {bmiInfo && (
              <View style={styles.bmiContainer}>
                <Text style={styles.bmiNum}>BMI {currentBMI?.toFixed(1)}</Text>
                <MochiBadge label={bmiInfo.label} color={colors.white} backgroundColor={bmiInfo.color} />
              </View>
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
        <Text style={styles.sectionTitle}>Tập luyện tuần này 🔥</Text>
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
            subtitle="Ước tính calo"
            icon={<Flame size={20} color={colors.peachDark} />}
            accentColor={colors.peach}
            style={styles.gridItem}
          />
        </View>

        {/* Log Exercise Action */}
        <View style={styles.logExerciseRow}>
          <Text style={styles.sectionTitle}>Lịch sử luyện tập 🏃</Text>
          <MochiButton title="+ Ghi bài tập" size="sm" onPress={() => setIsExerciseModalOpen(true)} />
        </View>

        <MochiCard style={styles.listCard}>
          {exerciseLogs.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyMascot}>🐱🏋️</Text>
              <Text style={styles.emptyText}>Chưa có buổi tập nào. Bấm '+ Ghi bài tập' để bắt đầu nhé!</Text>
            </View>
          ) : (
            exerciseLogs.map(log => {
              const info = EXERCISE_TYPES[log.exercise_type] || { label: log.exercise_type, icon: '⚡' }
              return (
                <View key={log.id} style={styles.logItem}>
                  <View style={styles.logLeft}>
                    <Text style={styles.logIcon}>{info.icon}</Text>
                    <View>
                      <Text style={styles.logTitle}>{info.label}</Text>
                      <Text style={styles.logDate}>{formatDate(log.log_date)} • {log.duration_minutes} phút</Text>
                    </View>
                  </View>
                  <View style={styles.logRight}>
                    <Text style={styles.calText}>+{log.calories_burned || 0} kcal</Text>
                    <MochiBadge
                      label={log.intensity === 'high' ? 'Cao' : log.intensity === 'light' ? 'Nhẹ' : 'Vừa'}
                      variant={log.intensity === 'high' ? 'peach' : log.intensity === 'light' ? 'mint' : 'cheese'}
                    />
                  </View>
                </View>
              )
            })
          )}
        </MochiCard>
      </ScrollView>

      {/* Log Weight Modal */}
      <Modal visible={isWeightModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Ghi nhận cân nặng ⚖️</Text>
            <MochiInput
              label="Cân nặng (kg)"
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
              placeholder="Cảm xúc, sau ăn sáng..."
              value={weightNote}
              onChangeText={setWeightNote}
            />
            <View style={styles.modalActions}>
              <MochiButton title="Hủy" variant="ghost" onPress={() => setIsWeightModalOpen(false)} style={{ flex: 1 }} />
              <MochiButton title="Lưu lại" loading={submittingWeight} onPress={handleSaveWeight} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Log Exercise Modal */}
      <Modal visible={isExerciseModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Ghi nhận bài tập 🏃</Text>

            <Text style={styles.fieldLabel}>Loại bài tập</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
              {Object.entries(EXERCISE_TYPES).map(([k, v]) => (
                <TouchableOpacity
                  key={k}
                  style={[styles.typeChip, selectedExercise === k && styles.typeChipActive]}
                  onPress={() => setSelectedExercise(k)}
                >
                  <Text>{v.icon}</Text>
                  <Text style={[styles.typeChipText, selectedExercise === k && styles.typeChipTextActive]}>{v.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <MochiInput
              label="Thời gian tập (phút)"
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
                  <Text style={[styles.intensityText, intensity === lvl && styles.intensityTextActive]}>
                    {lvl === 'light' ? 'Nhẹ' : lvl === 'moderate' ? 'Vừa' : 'Cao'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <MochiInput
              label="Ghi chú"
              placeholder="Cảm giác sau buổi tập..."
              value={exerciseNote}
              onChangeText={setExerciseNote}
            />

            <View style={styles.modalActions}>
              <MochiButton title="Hủy" variant="ghost" onPress={() => setIsExerciseModalOpen(false)} style={{ flex: 1 }} />
              <MochiButton title="Lưu bài tập" loading={submittingExercise} onPress={handleSaveExercise} style={{ flex: 1 }} />
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
    ...typography.bodySmall,
    color: colors.chocolateMuted,
    fontWeight: '600',
  },
  weightNum: {
    ...typography.titleLarge,
    fontSize: 32,
    fontWeight: '900',
    color: colors.chocolate,
    marginTop: 2,
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
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.chocolateBorder,
  },
  goalText: {
    ...typography.caption,
    color: colors.chocolateLight,
  },
  sectionTitle: {
    ...typography.titleSmall,
    color: colors.chocolate,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: spacing.lg,
  },
  gridItem: {
    flex: 1,
  },
  logExerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  listCard: {
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
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.chocolateBorder,
  },
  logLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  logIcon: {
    fontSize: 24,
  },
  logTitle: {
    ...typography.bodyMedium,
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
  fieldLabel: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.chocolateLight,
    marginBottom: 6,
  },
  typeScroll: {
    marginBottom: spacing.md,
  },
  typeChip: {
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
  typeChipActive: {
    backgroundColor: colors.cheeseLight,
    borderColor: colors.cheese,
  },
  typeChipText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.chocolate,
  },
  typeChipTextActive: {
    fontWeight: '800',
  },
  intensityRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md,
  },
  intensityBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.chocolateBorder,
    alignItems: 'center',
  },
  intensityBtnActive: {
    backgroundColor: colors.cheeseLight,
    borderColor: colors.cheese,
  },
  intensityText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.chocolateMuted,
  },
  intensityTextActive: {
    color: colors.chocolate,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: spacing.md,
  },
})
