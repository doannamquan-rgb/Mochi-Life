# Mochi Life Feature Parity Contract

> **Rule**: Mochi Life is a single unified product with two clients: **Next.js Web** and **Expo React Native Mobile**.
> Features default to **CROSS-PLATFORM**. A feature is NOT completed if Web = DONE and Mobile = MISSING.

---

## 1. Feature Parity Matrix

| Feature Domain | Feature Capability | Classification | Web Status | Mobile Status | Single Source of Truth / Backend |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Authentication** | Email & Password Login / Register | `CROSS-PLATFORM` | **DONE** | **DONE** | Supabase Auth |
| | Forgot Password & Recovery Email | `CROSS-PLATFORM` | **DONE** | **DONE** | Supabase Auth |
| | Reset Password (PKCE Standalone) | `CROSS-PLATFORM` | **DONE** | **DONE** | Supabase Auth (`/reset-password` & `mochilife://reset-password`) |
| | Session Auto-Refresh & AppState | `CROSS-PLATFORM` | **DONE** | **DONE** | `@supabase/ssr` (Web) / `AsyncStorage` + `processLock` (Mobile) |
| **Dashboard** | Level & XP Progress Bar | `CROSS-PLATFORM` | **DONE** | **DONE** | `@mochi/shared` (`calculateLevelFromXP`) |
| | Daily Study Streak Counter | `CROSS-PLATFORM` | **DONE** | **DONE** | `@mochi/shared` (`calculateStreak`) |
| | Daily Checklist (CRUD & Toggle) | `CROSS-PLATFORM` | **DONE** | **DONE** | `daily_checklists` table + RLS |
| | Quick Metrics (Wallets, Weight, Vocab) | `CROSS-PLATFORM` | **DONE** | **DONE** | Supabase PostgreSQL |
| **Finance** | Wallets Balance & Multi-wallet Tracking | `CROSS-PLATFORM` | **DONE** | **DONE** | `wallets` table |
| | Expense & Income Logging | `CROSS-PLATFORM` | **DONE** | **DONE** | `transactions` table + `@mochi/shared` (`formatVND`) |
| | Category Expense & Income Breakdown | `CROSS-PLATFORM` | **DONE** | **DONE** | `expense_categories` table |
| | Monthly Budgets & Threshold Tracking | `CROSS-PLATFORM` | **DONE** | **DONE** | `budgets` table |
| | Recurring Transactions Management | `CROSS-PLATFORM` | **DONE** | **DONE** | `recurring_transactions` table |
| **Fitness** | Weight Goal & Current Weight Tracking | `CROSS-PLATFORM` | **DONE** | **DONE** | `weight_goals` & `weight_logs` |
| | BMI & Health Category Calculation | `CROSS-PLATFORM` | **DONE** | **DONE** | `@mochi/shared` (`calculateBMI`, `getBMICategory`) |
| | Exercise Logging (11 Sports) | `CROSS-PLATFORM` | **DONE** | **DONE** | `@mochi/shared` (`EXERCISE_TYPES`, `estimateCalories`) |
| | Weekly Workout Minutes & Calorie Stats | `CROSS-PLATFORM` | **DONE** | **DONE** | `exercise_logs` table |
| **Chinese (HSK)** | HSK Courses & Level Hierarchy | `CROSS-PLATFORM` | **DONE** | **DONE** | `hsk_courses` & `hsk_lessons` |
| | Flashcard SM-2 Spaced Repetition | `CROSS-PLATFORM` | **DONE** | **DONE** | `@mochi/shared` (`calculateNextReview`, `isDueForReview`) |
| | Multiple Choice Vocabulary Quiz | `CROSS-PLATFORM` | **DONE** | **DONE** | `hsk_vocabulary` table |
| | Vocabulary List & Memory Levels | `CROSS-PLATFORM` | **DONE** | **DONE** | `hsk_vocabulary` table |
| | Grammar Points & Review | `CROSS-PLATFORM` | **DONE** | **DONE** | `hsk_grammar` table |
| | Bulk CSV / URL Course Importer | `WEB-ONLY` | **DONE** | *Deferred* | Large desktop workflow |
| **AI Assistant** | Interactive Companion Chat | `CROSS-PLATFORM` | **DONE** | **DONE** | `/api/ai/chat` (Gemini 3.7 Flash) |
| | Mochi Daily Brief & Insights | `CROSS-PLATFORM` | **DONE** | **DONE** | `/api/ai/daily-brief` |
| | Smart Event Reactions | `CROSS-PLATFORM` | **DONE** | **DONE** | `/api/ai/reaction` |
| **Gamification** | 25+ Master Achievements List | `CROSS-PLATFORM` | **DONE** | **DONE** | `@mochi/shared` (`MASTER_ACHIEVEMENTS`) |
| | Auto Unlock & Server RPC Evaluation | `CROSS-PLATFORM` | **DONE** | **DONE** | `check_and_unlock_achievements` RPC |
| | XP Logs & Level Milestones | `CROSS-PLATFORM` | **DONE** | **DONE** | `user_xp_logs` table |
| **Realtime Sync** | INSERT & UPDATE Live Propagation | `CROSS-PLATFORM` | **DONE** | **DONE** | Supabase Postgres Changes |
| | DELETE Eventual Refetch Consistency | `CROSS-PLATFORM` | **DONE** | **DONE** | Option A (Refetch on focus / screen resume) |
| **System** | Backup Export & Restore Tool | `WEB-ONLY` | **DONE** | *Deferred* | Desktop file management |
