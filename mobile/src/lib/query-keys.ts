/**
 * Standardized Query Key Factory for Mochi Life Mobile.
 * Ensures consistent cache invalidation between mutations, realtime subscriptions,
 * foreground resync, and logout cleanup.
 */

export const queryKeys = {
  // Auth & Profile
  profile: (userId?: string | null) => ['profile', userId ?? 'anon'] as const,

  // Finance
  wallets: (userId?: string | null) => ['wallets', userId ?? 'anon'] as const,
  categories: (userId?: string | null) => ['categories', userId ?? 'anon'] as const,
  transactions: (userId?: string | null) => ['transactions', userId ?? 'anon'] as const,
  budgets: (userId?: string | null, month?: number, year?: number) =>
    ['budgets', userId ?? 'anon', month ?? 'all', year ?? 'all'] as const,
  recurring: (userId?: string | null) => ['recurring', userId ?? 'anon'] as const,

  // Fitness
  weightGoal: (userId?: string | null) => ['weight-goal', userId ?? 'anon'] as const,
  weightLogs: (userId?: string | null) => ['weight-logs', userId ?? 'anon'] as const,
  exerciseLogs: (userId?: string | null) => ['exercise-logs', userId ?? 'anon'] as const,
  fitnessGoal: (userId?: string | null) => ['fitness-goal', userId ?? 'anon'] as const,

  // Chinese (HSK)
  hskCourses: (userId?: string | null) => ['hsk-courses', userId ?? 'anon'] as const,
  hskLessons: (userId?: string | null, courseId?: string | null) =>
    ['hsk-lessons', userId ?? 'anon', courseId ?? 'active'] as const,
  hskVocabulary: (userId?: string | null, courseId?: string | null) =>
    ['hsk-vocab', userId ?? 'anon', courseId ?? 'active'] as const,
  hskGrammar: (userId?: string | null, courseId?: string | null) =>
    ['hsk-grammar', userId ?? 'anon', courseId ?? 'active'] as const,
  studySessions: (userId?: string | null) => ['study-sessions', userId ?? 'anon'] as const,
  studyGoals: (userId?: string | null) => ['study-goals', userId ?? 'anon'] as const,

  // Gamification & Dashboard
  xp: (userId?: string | null) => ['xp', userId ?? 'anon'] as const,
  achievements: (userId?: string | null) => ['user-achievements', userId ?? 'anon'] as const,
  checklist: (userId?: string | null, dateStr?: string) =>
    ['checklist', userId ?? 'anon', dateStr ?? 'today'] as const,
  streak: (userId?: string | null) => ['study-streak', userId ?? 'anon'] as const,

  // AI
  dailyBrief: (userId?: string | null) => ['daily-brief', userId ?? 'anon'] as const,
}
