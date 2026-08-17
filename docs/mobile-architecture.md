# Mochi Life Mobile Architecture Specification

> **Mission**: One unified cross-platform product across Web (`/`) and Mobile (`/mobile`), powered by a single Supabase backend, RLS security, and pure domain package `@mochi/shared`.

---

## 1. High-Level Architecture Diagram

```text
┌────────────────────────────────────────────────────────┐
│                   Mochi Life Monorepo                  │
│                                                        │
│   ┌────────────────────┐      ┌────────────────────┐   │
│   │   Web Client       │      │   Mobile Client    │   │
│   │   (Next.js App)    │      │ (Expo React Native)│   │
│   └─────────┬──────────┘      └─────────┬──────────┘   │
│             │                           │              │
│             └─────────────┬─────────────┘              │
│                           │                            │
│              ┌────────────┴────────────┐               │
│              │     @mochi/shared       │               │
│              │  Types, Calculations,   │               │
│              │  SM-2, Gamification,    │               │
│              │  VND/BMI Formatters     │               │
│              └────────────┬────────────┘               │
└───────────────────────────┼────────────────────────────┘
                            │
               ┌────────────┴────────────┐
               │  Supabase PostgreSQL    │
               │  - Row Level Security   │
               │  - Atomic RPC Functions │
               │  - Realtime Publication │
               └────────────┬────────────┘
                            │
               ┌────────────┴────────────┐
               │  Next.js Server APIs    │
               │  - Dual Auth (Cookie/   │
               │    Bearer Token)        │
               │  - Gemini 3.7 Flash AI  │
               └─────────────────────────┘
```

---

## 2. Key Architecture Pillars

### A. Atomic Financial Transactions (`record_transaction_atomic` & `delete_transaction_atomic`)
- Prevents race conditions and wallet balance drift.
- Client mutations invoke PostgreSQL RPC with row locks (`FOR UPDATE`).
- Verifies authenticated user ownership (`auth.uid() = p_user_id`).
- Atomically computes deltas, updates `wallets.balance`, inserts transaction record, and rolls back atomically on any failure.

### B. Spaced Repetition (SM-2) & Chinese Course Management
- Source of truth for active course is stored in `user_profiles.active_hsk_course_id`.
- Dynamic course switching directly updates user profile and invalidates scoped query caches.
- Pure SM-2 algorithm in `@mochi/shared` calculates interval, ease factor, repetitions, and next review date.
- Review sessions automatically award XP logs and persist daily study sessions for continuous streak tracking.

### C. Mochi AI Assistant & Smart Event Reactions
- Mobile communicates with `/api/ai/chat` via Supabase JWT Bearer token (`Authorization: Bearer <token>`).
- Server validates token via `getAuthenticatedUser(request)` and proxies queries to Gemini 3.7 Flash with contextual domain retrieval.
- Thinking Modes supported:
  - `⚡ Siêu tốc` (`fast`, thinkingBudget = 0)
  - `⚖️ Cân bằng` (`balanced`, dynamic thinking)
  - `🧠 Suy luận sâu` (`deep`, thinkingBudget = 8192)
- In-flight request cancellation managed via `AbortController`.
- Fire-and-forget smart event reactions trigger floating celebration/encouragement toasts after mutations.

### D. Realtime Synchronization & AppState Lifecycle
- Full 14-table publication in `supabase_realtime` channels with `user_id=eq.{uid}` row filtering.
- Central `useAppLifecycleResync` listener detects `background -> active` state transitions, validates auth session, and debounces query refetches (15s throttle) to eliminate stale data on resume without request storms.

### E. Keyboard Safety & Responsive Safe Areas
- Reusable `KeyboardSafeModal` and `KeyboardAwareContainer` ensure all form inputs, select chips, and action buttons remain visible and interactive on Android and iOS devices.
- Backdrops support touch dismissal and Android hardware back button integration.
