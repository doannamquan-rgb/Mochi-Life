# Autonomous coding workflow

## Setup audit (2026-10-09)

Mochi Life is an npm workspace monorepo with a Next.js 16.2.12 / React 19 Web client, an Expo 57 / React Native 0.86 Mobile client, and the TypeScript source package `@mochi/shared`. Web uses Tailwind CSS 4, Radix UI and Zustand; Mobile uses Expo Router and AsyncStorage. Both use TanStack Query and Supabase. Server AI uses `@google/genai`; this setup introduces no OpenAI API dependency.

`app/api/` contains AI chat, daily brief, event reaction, URL import and data restore endpoints. `supabase/migrations/` contains migrations 001–016 for schema, RLS and transactional RPCs. Domain tests live in `lib/` and `packages/shared/src/`; Vitest runs in a Node environment.

Before setup, the root already had ESLint, Vitest, Next.js type generation and build commands; Mobile and shared had separate typechecks. Root TypeScript excludes Mobile, so a root-only typecheck was insufficient. ESLint was also scanning generated Mobile bundle output. The new commands cover all workspaces and ignore generated files while keeping source linted.

The repository had `AGENTS.md` and a `CLAUDE.md` reference to it, with no repository `.codex` configuration or CI workflow found. Existing global Codex configuration marks this repository trusted. Global settings and credentials were not changed. Trust does not override sandbox or approval policies. Repository instructions are used as described in the [official Codex prompting guide](https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide).

Pre-existing edits to the landing page, proxy, feature parity contract and calorie migration, plus untracked landing CSS and proxy tests, were preserved. This setup changes only agent instructions, quality scripts, lint exclusions and workflow documentation. No dependencies, secrets, runtime versions, database state or deployments were changed.

## Daily use

Give Codex a concrete task and expected behavior. `AGENTS.md` directs it to inspect relevant code, define acceptance criteria, implement, run checks, diagnose failures, fix its regressions and verify again. A routine task does not require repeated permission to continue.

From the root:

```sh
npm run check   # lint + Web/shared/Mobile typechecks + all Vitest tests
npm run verify  # check + Web production build + Android/iOS local bundle export
```

For iteration, use `npm test -- <test-file>`, `npm run typecheck:mobile`, or another focused command listed in `AGENTS.md`. Preserve existing failures as a baseline and explicitly report them; do not weaken validation to manufacture success. User-facing changes also require a browser/device behavior check appropriate to the feature. Automated compilation alone cannot verify UI behavior.

`npm run build:mobile` writes generated assets, Metro bundles and Hermes bytecode into the ignored `mobile/dist/qa` directory. It performs no EAS upload, OTA update, signing or native build. Native/device checks remain necessary for native-code changes; iOS native builds need a suitable macOS environment or an explicitly authorized remote build.

## Environment and permissions

Use Node and npm compatible with the installed toolchain; this audit ran with Node 24.11.1 and npm 11.6.2. Use the root lockfile for installation. Configure required public Supabase settings using the existing environment examples, without adding or displaying private secrets. The Web layout uses `next/font/google`, so a production build currently downloads Nunito from Google Fonts.

On this Windows environment, sandboxed Vitest failed during Vite configuration loading with `spawn EPERM`. Sandboxed Mobile export failed when invoking the Hermes bytecode compiler with the same error. Sandboxed Web build could not fetch Google Fonts. These require the supported command approval mechanism for child-process/network access; the agent must not work around denied approval by changing tools or disabling compilation. All unaffected local work should continue.

Approved verification commands run locally but may access the network as required by existing tooling. Production deploys, EAS updates/builds, live migrations, destructive data operations and changes to secrets require explicit authorization. `AGENTS.md` defines workflow, not additional privileges.

## Verification record

- Initial typechecks passed for Web, shared and Mobile.
- Initial approved Vitest run passed: 16 files, 110 tests.
- Source lint after excluding generated output: 0 errors, 129 existing warnings. They include unused variables and React hook warnings; cleanup is a separate scoped task. Existing warning-level rules were preserved.
- Approved Web production build passed, including TypeScript validation and static page generation.
- Full approved `npm run verify` passed with exit code 0: source lint (0 errors, 129 warnings), Web/shared/Mobile typechecks, 16 Vitest files / 110 tests, Web production build and Android/iOS Hermes bundle export.
- `git diff --check` passed. No unrelated source changes were made by this setup.

Non-failing tooling warning: Vite warns that the existing `vitest.config.ts` uses ESM syntax while loaded as CommonJS and may need a module-format update when a future Vite version switches its default loader. Current Vitest execution passed; no package-wide module format was changed during setup.

Remaining coverage limits: no React Native rendering/device test runner or live PostgreSQL/RLS integration harness is configured. Node unit tests do not validate production database migrations, external AI availability, native permissions or signed binaries. Add appropriate focused coverage when a future task touches those behaviors.
