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

# AUTONOMOUS WORKFLOW

## Scope and repository map

- Use npm and the root `package-lock.json`; this is an npm workspace monorepo.
- `app/`, `components/`, `hooks/`: Next.js App Router Web client, React 19, Tailwind CSS 4.
- `app/api/`, `lib/supabase/`, `lib/ai/`: dual-auth server APIs, Supabase integration, server-side Gemini AI.
- `mobile/app/`, `mobile/src/`: Expo Router, React Native, TanStack Query, AsyncStorage.
- `packages/shared/src/`: platform-independent domain logic and types; no browser, Next.js, or React Native dependencies.
- `supabase/migrations/`: ordered PostgreSQL schema, RLS and RPC migrations.
- `lib/**/__tests__/`, `packages/shared/src/__tests__/`: Vitest regression tests, discovered by the root test command.
- Read `docs/FEATURE_PARITY.md` for feature scope, `docs/CROSS_PLATFORM_RULES.md` and `docs/mobile-architecture.md` for architecture changes, and `docs/mobile-release.md` only for release work.
- `CLAUDE.md` delegates to this file. Preserve the Next.js rules above and read the relevant installed Next.js guide before coding.

## Execute until verified

1. Inspect applicable instructions, relevant source and `git status --short`. Preserve existing user changes and identify failures present before your edits.
2. Translate the request into observable acceptance criteria. For multi-step work, make a short plan, then implement it without waiting for permission to continue. For long work, keep progress and remaining steps in a task-specific document under `docs/`.
3. Choose reasonable implementation details within the request. Ask only when missing information materially blocks progress, a decision is irreversible, or authorization is required. Continue independent work while waiting.
4. Implement the smallest coherent change. Keep domain logic in shared, maintain Web/Mobile parity, and update relevant documentation when behavior changes.
5. Run relevant regression tests and quality checks. Diagnose failures, fix causes introduced by the change, and rerun affected checks until they pass or a real blocker remains.
6. Review the final diff for unintended files, exposed secrets, skipped tests, and parity/security regressions. Report the outcome, actual verification results, and remaining limitations.

Do not stop after analysis or planning, ask whether to continue routine authorized work, or claim completion from commands that were never run. Do not hide failures by disabling checks, weakening assertions, ignoring build type errors, or adding `--passWithNoTests`.

## Quality commands (run at repository root)

- `npm run lint`: lint maintained Web, Mobile, shared and tooling source; generated output and native build folders are excluded.
- `npm run typecheck`: generate Next.js route types and check Web TypeScript.
- `npm run typecheck:shared`: check the shared domain package.
- `npm run typecheck:mobile`: check the Expo client.
- `npm run typecheck:all`: check all three workspaces sequentially.
- `npm test`: run all discovered Vitest tests once; `npm run test:watch` is for interactive development only.
- `npm test -- lib/__tests__/auth-helper.test.ts`: example targeted regression check.
- `npm run check`: lint, all workspace typechecks, then tests; stops on any failure.
- `npm run build`: production Web compilation; currently requires Google Fonts network access and the documented Supabase public environment variables.
- `npm run build:mobile`: local Android/iOS JavaScript bundle export to `mobile/dist/qa`; does not publish or build a native APK/AAB/IPA.
- `npm run verify`: `check`, Web build, then local Mobile export; stops on any failure.

Run targeted checks during iteration and `npm run verify` before reporting a code/configuration task complete when the environment supports it. Documentation-only tasks may use link/content and diff review. Do not run Next.js type generation and Web production build concurrently because they share generated types. Add meaningful regression tests for changed algorithms, authorization, data mutations and bugs; UI work also needs browser/device verification where available. Root Vitest currently uses a Node environment; it does not verify React Native rendering, device behavior or live database RLS.

## Definition of done

- Requested behavior and acceptance criteria are implemented and checked.
- Relevant tests pass; lint has zero errors; all affected workspace typechecks pass. Explain existing warnings and introduce no new warnings in changed source.
- Web production build and Mobile local export pass for changes affecting those clients, or the exact environmental blocker is reported with the failing command. A blocked check is not a pass.
- Cross-platform capabilities work in both clients, or their explicit exception exists in `docs/FEATURE_PARITY.md`.
- API changes preserve cookie and Bearer authentication, ownership checks and RLS; migrations and financial RPC changes have appropriate review/validation.
- No introduced failure remains, and the final diff preserves unrelated work. Report pre-existing failures separately; fix them only when necessary for the task or authorized by its scope.

## Permissions and data safety

- Routine reads, scoped edits, local builds/tests and fixes are authorized within the task and granted workspace permissions. `AGENTS.md` cannot grant additional sandbox, network or account privileges.
- Respect sandbox and approval decisions. If a required command is blocked, use the supported escalation mechanism with the specific command and reason; never bypass it through another tool. If unavailable or denied, report the exact permission needed and continue work that remains authorized.
- Never print secret values or commit `.env*`, credentials or private user data. Do not change secrets, global Codex permissions, production configuration or production deployment without explicit authorization.
- Do not run destructive Git operations, delete important data, overwrite unrelated changes, apply migrations to a live database, restore user data, or publish EAS/Vercel updates without explicit authorization.
- Preserve Mobile app identifiers, signing configuration, EAS channels and `runtimeVersion` unless the task explicitly requires a reviewed change. EAS build/update commands are remote release actions, not local validation.
- Use the existing dependencies. Change manifests and lockfiles together when a dependency change is necessary; do not upgrade the stack as part of routine setup.

See `docs/AUTONOMOUS_WORKFLOW.md` for setup findings and environment limitations.
