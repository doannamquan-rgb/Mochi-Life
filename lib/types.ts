// Database types matching our Supabase schema

export type UserProfile = {
  id: string
  user_id: string
  display_name: string
  avatar_url: string | null
  height_cm: number | null
  date_of_birth: string | null
  gender: 'male' | 'female' | 'other' | null
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
  weight_unit: 'kg' | 'lbs'
  currency: string
  timezone: string
  theme: 'light' | 'dark'
  animations_enabled: boolean
  onboarding_completed: boolean
  active_hsk_course_id: string | null
  created_at: string
  updated_at: string
}

export type WeightGoal = {
  id: string
  user_id: string
  starting_weight: number
  current_weight: number | null
  target_weight: number
  start_date: string
  target_date: string | null
  daily_calorie_goal: number
  created_at: string
  updated_at: string
}

export type WeightLog = {
  id: string
  user_id: string
  log_date: string
  weight: number
  waist_cm: number | null
  hip_cm: number | null
  note: string | null
  photo_url: string | null
  is_sample_data: boolean
  created_at: string
  updated_at: string
}

export type FitnessGoal = {
  id: string
  user_id: string
  weekly_sessions: number
  weekly_minutes: number
  weekly_calories: number
  daily_steps: number
  created_at: string
  updated_at: string
}

export type ExerciseLog = {
  id: string
  user_id: string
  log_date: string
  exercise_type: string
  duration_minutes: number
  calories_burned: number | null
  calories_is_estimate: boolean
  intensity: 'light' | 'moderate' | 'high'
  distance_km: number | null
  steps: number | null
  note: string | null
  is_sample_data: boolean
  created_at: string
  updated_at: string
}

export type HskCourse = {
  id: string
  user_id: string
  name: string
  level: string
  description: string | null
  total_lessons: number
  total_vocabulary: number
  total_grammar: number
  source_url: string | null
  is_sample_data: boolean
  created_at: string
  updated_at: string
}

export type HskLesson = {
  id: string
  user_id: string
  course_id: string
  lesson_number: number
  title: string
  chapter: string | null
  topic: string | null
  status: 'not_started' | 'in_progress' | 'completed' | 'needs_review' | 'mastered'
  start_date: string | null
  completion_date: string | null
  progress_percent: number
  note: string | null
  is_sample_data: boolean
  created_at: string
  updated_at: string
}

export type MemoryLevel = 'not_learned' | 'hard' | 'learning' | 'learned' | 'mastered'

export type HskVocabulary = {
  id: string
  user_id: string
  course_id: string | null
  lesson_id: string | null
  hanzi: string
  pinyin: string
  meaning: string
  word_type: string | null
  example_cn: string | null
  example_pinyin: string | null
  example_vi: string | null
  topic: string | null
  memory_level: MemoryLevel
  first_learned_at: string | null
  last_reviewed_at: string | null
  next_review_at: string
  correct_count: number
  incorrect_count: number
  note: string | null
  is_favorite: boolean
  sr_interval_days: number
  sr_ease_factor: number
  sr_repetitions: number
  is_sample_data: boolean
  created_at: string
  updated_at: string
}

export type GrammarStatus = 'not_learned' | 'in_progress' | 'learned' | 'mastered'

export type HskGrammar = {
  id: string
  user_id: string
  course_id: string | null
  lesson_id: string | null
  structure_name: string
  formula: string | null
  meaning: string
  usage_desc: string | null
  example_cn: string | null
  example_pinyin: string | null
  example_vi: string | null
  notes: string | null
  common_mistakes: string | null
  status: GrammarStatus
  learned_at: string | null
  next_review_at: string
  sr_interval_days: number
  sr_ease_factor: number
  sr_repetitions: number
  is_sample_data: boolean
  created_at: string
  updated_at: string
}

export type ReviewRating = 'forgot' | 'hard' | 'remembered' | 'easy'

export type VocabularyReview = {
  id: string
  user_id: string
  vocabulary_id: string
  review_date: string
  rating: ReviewRating
  is_correct: boolean
  created_at: string
}

export type GrammarReview = {
  id: string
  user_id: string
  grammar_id: string
  review_date: string
  rating: ReviewRating
  is_correct: boolean
  created_at: string
}

export type StudySession = {
  id: string
  user_id: string
  session_date: string
  new_words_count: number
  reviewed_words_count: number
  grammar_points_count: number
  lessons_completed: number
  duration_minutes: number
  lesson_name: string | null
  quiz_score: number | null
  note: string | null
  is_auto_generated: boolean
  is_sample_data: boolean
  created_at: string
  updated_at: string
}

export type StudyGoal = {
  id: string
  user_id: string
  daily_new_words: number
  daily_review_words: number
  daily_minutes: number
  current_hsk_level: string
  current_proficiency: string
  created_at: string
  updated_at: string
}

export type ExpenseCategory = {
  id: string
  user_id: string
  name: string
  type: 'expense' | 'income'
  icon: string
  color: string
  is_default: boolean
  sort_order: number
  is_sample_data: boolean
  created_at: string
  updated_at: string
}

export type Wallet = {
  id: string
  user_id: string
  name: string
  type: 'cash' | 'bank' | 'ewallet' | 'credit_card' | 'other'
  balance: number
  icon: string
  color: string
  is_default: boolean
  is_sample_data: boolean
  created_at: string
  updated_at: string
}

export type Transaction = {
  id: string
  user_id: string
  type: 'expense' | 'income'
  amount: number
  transaction_date: string
  transaction_time: string | null
  category_id: string | null
  wallet_id: string | null
  payment_method: string | null
  description: string | null
  note: string | null
  receipt_url: string | null
  recurring_id: string | null
  occurrence_date: string | null
  is_sample_data: boolean
  created_at: string
  updated_at: string
  category?: ExpenseCategory
  wallet?: Wallet
}

export type Budget = {
  id: string
  user_id: string
  category_id: string | null
  month: number
  year: number
  amount: number
  is_total_budget: boolean
  alert_50: boolean
  alert_80: boolean
  alert_90: boolean
  alert_100: boolean
  cycle_start_day: number
  is_sample_data: boolean
  created_at: string
  updated_at: string
  category?: ExpenseCategory
}

export type RecurringTransaction = {
  id: string
  user_id: string
  type: 'expense' | 'income'
  amount: number
  category_id: string | null
  wallet_id: string | null
  description: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  next_due_date: string
  anchor_day: number | null
  anchor_month: number | null
  is_active: boolean
  note: string | null
  is_sample_data: boolean
  created_at: string
  updated_at: string
  category?: ExpenseCategory
  wallet?: Wallet
}

export type DailyChecklist = {
  id: string
  user_id: string
  checklist_date: string
  item_text: string
  is_completed: boolean
  category: 'fitness' | 'study' | 'expense' | 'other'
  sort_order: number
  created_at: string
  updated_at: string
}

export type Achievement = {
  id: string
  code: string
  name: string
  description: string
  icon: string
  category: 'fitness' | 'study' | 'expense' | 'general'
  condition_type: string
  condition_value: number
  created_at: string
}

export type UserAchievement = {
  id: string
  user_id: string
  achievement_id: string
  unlocked_at: string
  achievement?: Achievement
}

export type UserXpLog = {
  id: string
  user_id: string
  amount: number
  action_type: string
  reference_id: string | null
  created_at: string
}

export type WeeklyReview = {
  id: string
  user_id: string
  week_start: string
  week_end: string
  what_went_well: string | null
  what_blocked: string | null
  improvement_plan: string | null
  top_priority: string | null
  auto_summary: string | null
  created_at: string
  updated_at: string
}

export type DataImportJob = {
  id: string
  user_id: string
  source_url: string | null
  source_type: 'csv' | 'json' | 'manual' | 'paste' | 'url' | null
  status: 'pending' | 'processing' | 'completed' | 'failed'
  lessons_imported: number
  vocabulary_imported: number
  grammar_imported: number
  error_message: string | null
  last_synced_at: string | null
  created_at: string
  updated_at: string
}

export type DateRange = {
  from: Date
  to: Date
}

export type ChartPeriod = '7d' | '30d' | '3m' | '6m' | '1y' | 'all'

export type TransactionFilter = {
  type?: 'expense' | 'income'
  category_id?: string
  wallet_id?: string
  date_from?: string
  date_to?: string
  search?: string
}
