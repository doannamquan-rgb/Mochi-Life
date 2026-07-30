// Formatting utilities for Mochi Life

// Format VND currency
export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Math.abs(amount))
}

// Format VND with explicit transaction type sign (+ or -)
export function formatTransactionAmount(amount: number, type: 'expense' | 'income'): string {
  const formatted = formatVND(amount)
  return type === 'income' ? `+${formatted}` : `-${formatted}`
}

// Format VND without symbol
export function formatVNDNumber(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.abs(amount))
}

// Format compact (e.g., 1.5tr, 250k)
export function formatVNDCompact(amount: number): string {
  const abs = Math.abs(amount)
  if (abs >= 1_000_000_000) return `${(abs / 1_000_000_000).toFixed(1)} tỷ`
  if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(1)} tr`
  if (abs >= 1_000) return `${(abs / 1_000).toFixed(0)}k`
  return `${abs} ₫`
}

// Format weight (kg)
export function formatWeight(weight: number, unit: 'kg' | 'lbs' = 'kg'): string {
  if (unit === 'lbs') return `${(weight * 2.205).toFixed(1)} lbs`
  return `${weight.toFixed(1)} kg`
}

// Format BMI
export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100
  return weightKg / (heightM * heightM)
}

export function formatBMI(bmi: number): string {
  return bmi.toFixed(1)
}

export function getBMICategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: 'Thiếu cân', color: '#8F71F5' }
  if (bmi < 25) return { label: 'Bình thường', color: '#3BB88E' }
  if (bmi < 30) return { label: 'Thừa cân', color: '#FFCA1A' }
  return { label: 'Béo phì', color: '#FF7A5C' }
}

// Format duration in minutes to readable
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} phút`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (m === 0) return `${h} giờ`
  return `${h}g ${m}p`
}

// Format percentage
export function formatPercent(value: number, total: number): string {
  if (total === 0) return '0%'
  return `${Math.round((value / total) * 100)}%`
}

// Get percentage as number
export function getPercent(value: number, total: number): number {
  if (total === 0) return 0
  return Math.min(100, Math.round((value / total) * 100))
}

// Format number with sign
export function formatWithSign(value: number, suffix = ''): string {
  if (value > 0) return `+${value.toFixed(1)}${suffix}`
  if (value < 0) return `${value.toFixed(1)}${suffix}`
  return `0${suffix}`
}

// Exercise types mapping
export const EXERCISE_TYPES: Record<string, { label: string; icon: string; estimateCal: number }> = {
  walking: { label: 'Đi bộ', icon: '🚶', estimateCal: 4 },
  running: { label: 'Chạy bộ', icon: '🏃', estimateCal: 8 },
  cycling: { label: 'Đạp xe', icon: '🚴', estimateCal: 6 },
  jumping_rope: { label: 'Nhảy dây', icon: '⚡', estimateCal: 10 },
  cardio: { label: 'Cardio', icon: '💓', estimateCal: 7 },
  gym: { label: 'Tập gym', icon: '🏋️', estimateCal: 5 },
  yoga: { label: 'Yoga', icon: '🧘', estimateCal: 3 },
  swimming: { label: 'Bơi', icon: '🏊', estimateCal: 8 },
  badminton: { label: 'Cầu lông', icon: '🏸', estimateCal: 6 },
  home_workout: { label: 'Bài tập tại nhà', icon: '🏠', estimateCal: 5 },
  other: { label: 'Khác', icon: '✨', estimateCal: 5 },
}

export function getExerciseLabel(type: string): string {
  return EXERCISE_TYPES[type]?.label ?? type
}

export function getExerciseIcon(type: string): string {
  return EXERCISE_TYPES[type]?.icon ?? '⚡'
}

// Estimate calories burned
export function estimateCalories(exerciseType: string, durationMinutes: number): number {
  const calPerMin = EXERCISE_TYPES[exerciseType]?.estimateCal ?? 5
  return Math.round(calPerMin * durationMinutes)
}

// Intensity labels
export const INTENSITY_LABELS = {
  light: { label: 'Nhẹ', color: '#3BB88E', badge: 'mint' },
  moderate: { label: 'Vừa', color: '#FFCA1A', badge: 'cheese' },
  high: { label: 'Cao', color: '#FF7A5C', badge: 'peach' },
}

// Lesson status labels
export const LESSON_STATUS_LABELS = {
  not_started: { label: 'Chưa học', color: '#B8997A', badge: 'chocolate' },
  in_progress: { label: 'Đang học', color: '#FFCA1A', badge: 'cheese' },
  completed: { label: 'Đã học', color: '#3BB88E', badge: 'mint' },
  needs_review: { label: 'Cần ôn lại', color: '#FF7A5C', badge: 'peach' },
  mastered: { label: 'Thành thạo', color: '#8F71F5', badge: 'lavender' },
}

// Memory level labels
export const MEMORY_LEVEL_LABELS = {
  not_learned: { label: 'Chưa học', color: '#B8997A', stars: 0 },
  hard: { label: 'Khó nhớ', color: '#FF7A5C', stars: 1 },
  learning: { label: 'Đang nhớ', color: '#FFCA1A', stars: 2 },
  learned: { label: 'Đã nhớ', color: '#3BB88E', stars: 3 },
  mastered: { label: 'Thành thạo', color: '#8F71F5', stars: 4 },
}

// Expense category defaults
export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Ăn uống', icon: '🍜', color: '#FF7A5C', type: 'expense' as const },
  { name: 'Đi lại', icon: '🚌', color: '#FFCA1A', type: 'expense' as const },
  { name: 'Mua sắm', icon: '🛍️', color: '#8F71F5', type: 'expense' as const },
  { name: 'Học tập', icon: '📚', color: '#3BB88E', type: 'expense' as const },
  { name: 'Sức khỏe', icon: '💊', color: '#5ECFAA', type: 'expense' as const },
  { name: 'Làm đẹp', icon: '💄', color: '#FF9A80', type: 'expense' as const },
  { name: 'Giải trí', icon: '🎮', color: '#A990FF', type: 'expense' as const },
  { name: 'Nhà ở', icon: '🏠', color: '#FFD84D', type: 'expense' as const },
  { name: 'Hóa đơn', icon: '📋', color: '#B8997A', type: 'expense' as const },
  { name: 'Quà tặng', icon: '🎁', color: '#FF9A80', type: 'expense' as const },
  { name: 'Du lịch', icon: '✈️', color: '#5ECFAA', type: 'expense' as const },
  { name: 'Khác', icon: '⭐', color: '#B8997A', type: 'expense' as const },
  // Income
  { name: 'Lương', icon: '💰', color: '#3BB88E', type: 'income' as const },
  { name: 'Thưởng', icon: '🎉', color: '#FFCA1A', type: 'income' as const },
  { name: 'Làm thêm', icon: '💼', color: '#5ECFAA', type: 'income' as const },
  { name: 'Được tặng', icon: '🎁', color: '#FF9A80', type: 'income' as const },
  { name: 'Hoàn tiền', icon: '↩️', color: '#8F71F5', type: 'income' as const },
  { name: 'Khác', icon: '⭐', color: '#B8997A', type: 'income' as const },
]

// Wallet type labels
export const WALLET_TYPE_LABELS = {
  cash: { label: 'Tiền mặt', icon: '💵' },
  bank: { label: 'Ngân hàng', icon: '🏦' },
  ewallet: { label: 'Ví điện tử', icon: '📱' },
  credit_card: { label: 'Thẻ tín dụng', icon: '💳' },
  other: { label: 'Khác', icon: '🪙' },
}

// Payment methods
export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Tiền mặt' },
  { value: 'bank_transfer', label: 'Chuyển khoản' },
  { value: 'momo', label: 'MoMo' },
  { value: 'zalopay', label: 'ZaloPay' },
  { value: 'credit_card', label: 'Thẻ tín dụng' },
  { value: 'debit_card', label: 'Thẻ ghi nợ' },
  { value: 'other', label: 'Khác' },
]

// Frequency labels
export const FREQUENCY_LABELS = {
  daily: 'Hằng ngày',
  weekly: 'Hằng tuần',
  monthly: 'Hằng tháng',
  yearly: 'Hằng năm',
}

// Module Category Labels (Strict Vietnamese translation)
export const MODULE_CATEGORY_LABELS = {
  fitness: { label: 'Sức khỏe', color: '#FF7A5C', emoji: '💪' },
  study: { label: 'Học tập', color: '#8F71F5', emoji: '📚' },
  expense: { label: 'Tài chính', color: '#3BB88E', emoji: '💰' },
  general: { label: 'Tổng hợp', color: '#FFCA1A', emoji: '🌟' },
}

// Word type labels
export const WORD_TYPE_LABELS: Record<string, string> = {
  noun: 'Danh từ',
  verb: 'Động từ',
  adjective: 'Tính từ',
  adverb: 'Phó từ',
  preposition: 'Giới từ',
  conjunction: 'Liên từ',
  pronoun: 'Đại từ',
  measure_word: 'Lượng từ',
  particle: 'Trợ từ',
  interjection: 'Thán từ',
  other: 'Khác',
}

