# Mochi Life Cross-Platform Development Rules

> **Core Philosophy**: One product. Two clients (**Web** + **Mobile**). Single source of truth.

---

## 1. Single Source of Truth (`@mochi/shared`)
- All pure business logic, calculations, algorithm implementations, constants, and data types must reside in `packages/shared/src/`.
- Never duplicate logic across `app/` (Web) and `mobile/` (React Native).
- Calculations (BMI, streak, XP, SM-2 spaced repetition, calorie estimates, currency formatters) must have **EXACTLY ONE** implementation.
- `@mochi/shared` must remain agnostic: **NO** `window`, `document`, `localStorage`, Next.js imports, or React Native imports inside `@mochi/shared`.

## 2. Cross-Platform Feature Parity Gate
- When implementing any new user-facing capability, classify it explicitly:
  - `CROSS-PLATFORM` (Default)
  - `WEB-ONLY` (Specialized large-screen workflows, e.g. bulk CSV/JSON import)
  - `MOBILE-ONLY` (Hardware-specific native capabilities)
- A cross-platform feature is **NOT complete** until implemented in both Web and Mobile.

## 3. Server API & Dual Authentication
- Route Handlers in `app/api/*` must use `getAuthenticatedUser(request)` from `@/lib/supabase/auth-helper`.
- Supports both:
  - **Web Client**: Supabase SSR Cookies (`cookies()`).
  - **Mobile Client**: Supabase Bearer token (`Authorization: Bearer <access_token>`).
- Never trust `user_id` from client request bodies.
- Never place server secrets (`SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, database passwords) in the mobile client or `EXPO_PUBLIC_*` environment variables.

## 4. Mobile Architecture & Storage
- Supabase React Native client must use:
  - `@react-native-async-storage/async-storage` for session storage
  - `processLock` to prevent refresh token race conditions
  - Explicit PKCE auth flow (`flowType: 'pkce'`)
  - AppState auto-refresh registered ONCE at root scope (`setupSupabaseAuthLifecycle`)
- TanStack Query v5 is configured with **in-memory cache only** for v1 (no disk persistence of sensitive health/finance data).

## 5. Realtime Sync & Delete Security (Option A)
- Realtime Postgres Changes subscriptions are enabled for `INSERT` and `UPDATE` events on user-filtered channels (`user_id=eq.{uid}`).
- `DELETE` events do not expose raw payload data securely over Realtime in Postgres; companion clients discover deletions via screen focus refetch (`useFocusEffect`) or app resume.
