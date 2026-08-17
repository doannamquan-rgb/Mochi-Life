<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# MOCHI LIFE CROSS-PLATFORM AGENT RULES

1. **One Product, Two Clients**: Web (`/`) and Mobile (`/mobile`) share one Supabase backend, RLS, Next.js AI APIs, and domain logic package `@mochi/shared`.
2. **Single Source of Truth**: All calculations (BMI, streak, XP, SM-2 spaced repetition, calorie estimates, currency formatters) and domain types MUST reside in `@mochi/shared`. Never duplicate domain logic across Web and Mobile.
3. **Cross-Platform Feature Parity Gate**: Every user-facing capability must be implemented on BOTH Web and Mobile clients unless explicitly designated as `WEB-ONLY` or `MOBILE-ONLY` in `docs/FEATURE_PARITY.md`.
4. **Server API Dual Auth**: Server route handlers in `app/api/*` must use `getAuthenticatedUser(request)` to support both Web SSR cookies and Mobile Bearer tokens. Never trust client body `user_id`.
5. **No Secrets in Mobile**: Never put `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, or database credentials in mobile code or `EXPO_PUBLIC_*` variables.
