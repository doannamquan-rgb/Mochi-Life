# MOCHI LIFE — AUDIT & IMPROVEMENT PLAN (v2 — Updated)

> **Tài liệu Kế hoạch Kiểm tra & Cải tiến Toàn diện Hệ thống Mochi Life**
> Ngày lập: 14/08/2026 · Cập nhật: 14/08/2026 (v2 — post-review)
> Phiên bản hệ thống: 4.0.0 (Next.js 16.2.12, React 19.2.4, `@google/genai` 2.16.0)

---

## 0. QUYẾT ĐỊNH KHÔNG THỰC HIỆN VÀ LÝ DO

1. **KHÔNG phát triển Mobile App** (Android/iOS/Flutter/React Native/Capacitor/APK/AAB). Web Responsive + PWA là chiến lược duy nhất.
2. **KHÔNG xây dựng Offline Sync Engine** (IndexedDB queue / local mirror). Service worker chỉ phục vụ cache tĩnh.
3. **KHÔNG Rewrite Framework**. Giữ nguyên Next.js 16 + React 19 + TypeScript + Supabase + Tailwind v4.
4. **KHÔNG thay đổi Theme / UI Kawaii cốt lõi**. Bảng màu pastel, giọng tiếng Việt dễ thương là linh hồn nhận diện.
5. **KHÔNG sửa đổi migration 001–007**. Mọi thay đổi schema đặt trong migration mới có số thứ tự tiếp nối.
6. **KHÔNG sử dụng `next lint`** — đã bị loại bỏ hoàn toàn trong Next.js 16.

---

## 1. TỔNG QUAN AUDIT ĐÃ THỰC HIỆN

Đã audit toàn bộ: `package.json`, `tsconfig.json`, 7 migration SQL, `proxy.ts` (middleware), 3 API routes AI, 1 API route import URL, App shell layout, Dashboard, 4 trang Fitness, 6 trang Chinese/HSK, 4 trang Expenses, Calendar, Achievements, Settings, lib modules (`ai/client.ts`, `ai/context.ts`, `ai/privacy.ts`, `ai/rate-limit.ts`, `ai/reactions/*`, `events.ts`, `gamification.ts`, `recurring-sync.ts`, `chinese-stats.ts`, `finance-stats.ts`, `fitness-stats.ts`, `date-utils.ts`, `format.ts`, `spaced-repetition.ts`, `types.ts`, `backup.ts` chưa tồn tại), hooks (`use-user.ts`, `use-data-changed.ts`, `use-mochi-reaction.ts`).

### Baseline Status
- `npm test`: 25/25 tests pass (Vitest)
- `npx tsc --noEmit`: FAIL — 6 lỗi TS trong `lib/ai/__tests__/reactions.test.ts`
- `npm run build`: PASS — 36 routes biên dịch thành công
- ESLint: **CHƯA CÀI ĐẶT** — Next.js 16 đã loại bỏ `next lint`

---

## 2. CANONICAL BACKUP TABLE INVENTORY

Dựa trên schema thực tế từ migration 001–007:

### A. Durable User Data — BẮT BUỘC backup (23 bảng)

| # | Bảng | Unique Constraint | FK Dependencies |
|---|---|---|---|
| 1 | `user_profiles` | `(user_id)` | → `hsk_courses` (active_hsk_course_id) |
| 2 | `weight_goals` | `(user_id)` | — |
| 3 | `weight_logs` | `(user_id, log_date)` | — |
| 4 | `fitness_goals` | `(user_id)` | — |
| 5 | `exercise_logs` | — | — |
| 6 | `hsk_courses` | — | — |
| 7 | `hsk_lessons` | — | → `hsk_courses` |
| 8 | `hsk_vocabulary` | — | → `hsk_courses`, `hsk_lessons` |
| 9 | `hsk_grammar` | — | → `hsk_courses`, `hsk_lessons` |
| 10 | `vocabulary_reviews` | — | → `hsk_vocabulary` |
| 11 | `grammar_reviews` | — | → `hsk_grammar` |
| 12 | `study_sessions` | — | — |
| 13 | `study_goals` | `(user_id)` | — |
| 14 | `expense_categories` | — | — |
| 15 | `wallets` | — | — |
| 16 | `recurring_transactions` | — | → `expense_categories`, `wallets` |
| 17 | `transactions` | `(recurring_id, occurrence_date)` partial | → `expense_categories`, `wallets`, `recurring_transactions` |
| 18 | `budgets` | `(user_id, category_id, month, year)` | → `expense_categories` |
| 19 | `daily_checklists` | — | — |
| 20 | `user_achievements` | `(user_id, achievement_id)` | → `achievements` (global) |
| 21 | `weekly_reviews` | `(user_id, week_start)` | — |
| 22 | `data_import_jobs` | — | — |
| 23 | `user_xp_logs` | — (thiếu idempotency constraint) | — |

### B. Global/Reference Data — KHÔNG export dưới dạng user-owned
- `achievements` — Dữ liệu toàn cục, seeded từ migration 003/005. Restore sẽ map `user_achievements` theo `achievement.code` thay vì UUID.

### C. Storage Files — KHÔNG nằm trong JSON backup
- `user_profiles.avatar_url`, `weight_logs.photo_url`, `transactions.receipt_url` tham chiếu đến Supabase Storage bucket `mochi-uploads`.
- **JSON backup KHÔNG bao gồm binary files**. Tài liệu và UI phải ghi rõ: "Database backup does not include uploaded binary files (avatar, weight photos, receipt images)."
- Không cần overengineer ZIP backup vì storage usage hiện tại rất hạn chế.

### Restore Dependency Graph (Insertion Order)
```
1. hsk_courses
2. expense_categories, wallets
3. hsk_lessons (→ hsk_courses)
4. hsk_vocabulary (→ hsk_courses, hsk_lessons)
5. hsk_grammar (→ hsk_courses, hsk_lessons)
6. vocabulary_reviews (→ hsk_vocabulary)
7. grammar_reviews (→ hsk_grammar)
8. recurring_transactions (→ expense_categories, wallets)
9. transactions (→ expense_categories, wallets, recurring_transactions)
10. budgets (→ expense_categories)
11. user_achievements (→ achievements global, map by code)
12. Tất cả bảng còn lại (independent): weight_goals, weight_logs, fitness_goals,
    exercise_logs, study_sessions, study_goals, daily_checklists,
    weekly_reviews, data_import_jobs, user_xp_logs, user_profiles (cuối cùng vì ref → hsk_courses)
```

---

## 3. BẢNG TỔNG HỢP VẤN ĐỀ (Đã cập nhật)

| ID | Vấn đề | Severity | Phase |
|---|---|---|---|
| **SEC-01** | Import URL route thiếu auth + SSRF redirect follow không validate destination | **Critical** | 1 |
| **SEC-02** | `check_and_unlock_achievements` RPC: SECURITY DEFINER, không check `auth.uid()`, user A gọi với ID user B | **Critical** | 1 |
| **SEC-03** | `user_xp_logs` RLS cho phép INSERT arbitrary amount, không có unique constraint idempotency | **Critical** | 1 |
| **AI-01** | Gemini timeout/abort: `AbortController` tạo nhưng không truyền `abortSignal` vào SDK config; `generateReactionResponse` có fake no-op setTimeout | **Critical** | 2 |
| **TS-01** | TypeScript compilation lỗi trong reactions.test.ts | **High** | 2 |
| **REC-01** | Recurring monthly drift: không có `anchor_day` persist, kẹt ngày 28 sau Feb | **High** | 2 |
| **REC-02** | Recurring sync advance `next_due_date` ngay cả khi insert thất bại (network/DB error khác 23505) | **High** | 2 |
| **REC-03** | Recurring sync dùng `new Date().toISOString().split('T')[0]` — lệch ngày UTC vs Asia/Ho_Chi_Minh | **High** | 2 |
| **SYNC-01** | Streak reset về 0 khi chưa học hôm nay | **High** | 2 |
| **EVT-01** | 9 trang thiếu `notifyDataChanged` / `useDataChanged` | **High** | 2 |
| **DATA-01** | Backup thiếu bảng, không phân trang, chưa có versioned format, chưa có transactional restore | **High** | 3 |
| **GAME-01** | `awardXP` không được gọi ở bất kỳ action nào; thiếu DB-level idempotency | **Medium** | 4 |
| **DB-01** | Thiếu index hiệu năng cho một số FK và query pattern | **Medium** | 5 |
| **PK-01** | Thiếu scripts `typecheck`, `lint`; ESLint chưa cài | **Medium** | 6 |
| **AI-02** | Rate limiter in-memory Map — reset trên serverless cold start | **Low** | Decision |
| **DOC-01** | README mô tả sai số migration, thiếu hướng dẫn lint/typecheck/backup | **Low** | 7 |

---

## 4. CHI TIẾT TỪNG VẤN ĐỀ VÀ GIẢI PHÁP

---

### [SEC-01] [CRITICAL] Import URL — Auth + Full SSRF Redirect Hardening

**File**: `app/api/import/url/route.ts`

**Vấn đề hiện tại**:
1. Không có `auth.getUser()` → bất kỳ ai trên Internet có thể sử dụng endpoint này.
2. Dùng `redirect: 'follow'` nhưng chỉ validate hostname ban đầu. Nếu `safe-domain.com → 302 → 169.254.169.254` (AWS metadata), destination mới không được validate.
3. Response body được đọc hết vào memory (`response.text()`) trước khi check size nếu server không gửi `Content-Length`.
4. `error.message` trả thẳng cho client, có thể lộ internal implementation details.

**Giải pháp**:
1. Thêm `auth.getUser()` — trả 401 nếu chưa đăng nhập.
2. Chuyển sang `redirect: 'manual'` + helper loop:
   ```
   validate URL → resolve DNS → validate IPs → fetch (redirect: manual)
   → if 3xx: extract Location → validate protocol/hostname/IP → repeat
   → max 5 redirect hops → abort nếu vượt
   ```
   Mỗi hop kiểm tra: protocol, hostname, private IPv4, loopback, link-local, IPv6 local/private, IPv4-mapped IPv6, embedded credentials.
3. Đọc response body theo stream/chunks, abort khi tích lũy vượt 5MB.
4. Server log lỗi chi tiết; client nhận message tiếng Việt an toàn, không lộ `error.message` nội bộ.

**Test**: auth required, redirect-to-private blocked, redirect loop blocked, oversized body blocked, localhost blocked, private IPv4/IPv6 blocked, public URL passes, unauthenticated → 401.

---

### [SEC-02] [CRITICAL] `check_and_unlock_achievements` RPC Security

**File**: Tạo migration mới

**Vấn đề**: Function là `SECURITY DEFINER` (bypass RLS), nhận `p_user_id` từ caller, KHÔNG check `p_user_id = auth.uid()`. User A có thể gọi RPC với ID user B để inspect/mutate achievements.

**Giải pháp**:
1. Tạo migration mới `CREATE OR REPLACE FUNCTION check_and_unlock_achievements(p_user_id UUID)` với guard:
   ```sql
   IF p_user_id != auth.uid() THEN
     RAISE EXCEPTION 'Unauthorized: user mismatch';
   END IF;
   ```
2. Thêm `REVOKE EXECUTE ON FUNCTION check_and_unlock_achievements FROM PUBLIC, anon;` + `GRANT EXECUTE TO authenticated;`
3. Giữ `SECURITY DEFINER` vì function cần bypass RLS để đọc `achievements` global table.

---

### [SEC-03] [CRITICAL] XP Write Path Security & Idempotency

**File**: Tạo migration mới, sửa `lib/gamification.ts`

**Vấn đề**:
- `user_xp_logs` RLS: `FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)` — client có thể INSERT `amount: 999999999`.
- Không có unique constraint trên `(user_id, action_type, reference_id)` → double-click/refresh nhân đôi XP.

**Giải pháp**:
1. Tạo migration mới thêm:
   - `UNIQUE INDEX idx_user_xp_logs_idempotency ON user_xp_logs(user_id, action_type, reference_id) WHERE reference_id IS NOT NULL`
   - `CHECK (amount > 0 AND amount <= 100)` constraint (giới hạn hợp lý cho personal app)
2. Trong `lib/gamification.ts`: `awardXP` phải sử dụng `reference_id` format chuẩn:
   - `exercise:create:<exerciseLogId>`, `weight:create:<weightLogId>`, `study:create:<sessionDate>`, `quiz:<timestamp>`, `transaction:create:<txId>`
3. **Rationale**: Đây là personal app nên không cần server-side RPC cho XP — RLS `auth.uid() = user_id` + DB constraints đủ đảm bảo integrity. Nếu user hack chính data của mình thì không ảnh hưởng ai khác. Ghi rõ: "XP integrity relies on DB constraints (amount cap + idempotency index). Server-side RPC not implemented because this is a single-user personal app."

---

### [AI-01] [CRITICAL] Gemini SDK Timeout & Abort

**File**: `lib/ai/client.ts`

**Vấn đề**: `@google/genai` v2.16.0 **hỗ trợ native** cả `config.abortSignal` và `config.httpOptions.timeout`. Code hiện tại tạo `AbortController` nhưng KHÔNG truyền `abortSignal` vào config. `generateReactionResponse` có `setTimeout(() => { /* no-op */ }, 20000)`.

**Giải pháp — sử dụng native SDK features**:
1. Truyền `abortSignal: controller.signal` vào `config` của mỗi lệnh gọi SDK.
2. Đồng thời set `httpOptions: { timeout: timeoutMs }` làm lớp bảo vệ HTTP native.
3. `setTimeout(() => controller.abort(), timeoutMs)` kết hợp với `abortSignal` → SDK thực sự abort request khi timeout.
4. `Promise.race` chỉ làm fallback safety net nếu SDK không ném AbortError đúng cách.
5. `finally` block luôn `clearTimeout`.
6. Mỗi function bắt `AbortError` → trả thông điệp tiếng Việt thân thiện.

**Timeout values**: Chat 30s, Daily Brief 30s, Reaction 20s.

**Chuỗi xử lý**:
```
timeout xảy ra → controller.abort()
→ SDK abort request (abortSignal native)
→ httpOptions.timeout cũng ngắt kết nối HTTP
→ caller được giải phóng
→ timer được cleanup (clearTimeout)
→ UI nhận fallback thân thiện
→ không có unhandled rejection
```

**Test**: request thành công trước timeout, request vượt timeout, Gemini throw error, timer cleanup, không có unhandled promise rejection.

---

### [REC-01] [HIGH] Recurring Anchor Day Phải Persist Trong Database

**File**: Tạo migration mới, sửa `lib/recurring-sync.ts`, sửa `lib/types.ts`, sửa form recurring

**Vấn đề**: `recurring_transactions` không có `anchor_day`. Khi Jan 31 → Feb 28 → Mar 28 (thay vì Mar 31), ngày bị drift vĩnh viễn.

**Giải pháp**:
1. Migration mới thêm 2 cột:
   - `anchor_day SMALLINT` — ngày trong tháng ban đầu (1–31) cho monthly
   - `anchor_month SMALLINT` — tháng ban đầu (1–12) cho yearly
2. Backfill an toàn: `UPDATE recurring_transactions SET anchor_day = EXTRACT(DAY FROM next_due_date)::SMALLINT, anchor_month = EXTRACT(MONTH FROM next_due_date)::SMALLINT WHERE anchor_day IS NULL;`
3. Cập nhật `calculateNextDueDate(fromDate, frequency, anchorDay?, anchorMonth?)`:
   - Monthly: Tính target = `min(anchorDay, daysInTargetMonth)`. Jan 31 → Feb 28 → Mar 31 → Apr 30 → May 31.
   - Yearly: Feb 29 yearly → Feb 28 (non-leap) → Feb 29 (leap). Sử dụng `anchorDay + anchorMonth`.
4. Cập nhật TypeScript type `RecurringTransaction` với `anchor_day` và `anchor_month`.
5. Cập nhật form tạo/sửa recurring để set anchor.

**Test**: Jan31→Feb28→Mar31, Jan30→Feb28→Mar30, leap year Feb29, yearly Feb29.

---

### [REC-02] [HIGH] Recurring Sync — Không Advance Khi Insert Thất Bại

**File**: `lib/recurring-sync.ts`

**Vấn đề**: Khi insert giao dịch thất bại (network error, RLS error, DB error), code vẫn tiếp tục vòng lặp và advance `next_due_date`, dẫn đến mất giao dịch.

**Giải pháp**:
1. Phân biệt lỗi:
   - Insert success → advance.
   - PostgreSQL `23505` (unique violation: đã tồn tại) → safe to advance.
   - Mọi lỗi khác → **STOP vòng lặp**, log error, **KHÔNG advance** `next_due_date`.
2. Kiểm tra lỗi khi update `next_due_date` — không ignore update error.
3. Race condition: Unique partial index `idx_transactions_recurring_occurrence` trên `(recurring_id, occurrence_date)` đảm bảo idempotency cho concurrent sync. Test chứng minh.

**Test**: 23505 conflict advances, network/DB error does NOT advance, update error handled.

---

### [REC-03] [HIGH] Timezone trong Recurring Sync

**File**: `lib/recurring-sync.ts`, `lib/date-utils.ts`

**Vấn đề**: `new Date().toISOString().split('T')[0]` trả về ngày UTC. Lúc 00:30–06:59 Asia/Ho_Chi_Minh, ngày UTC là ngày trước → occurrence bị gán sai ngày.

**Giải pháp**: Centralize tất cả date-only logic qua `todayString()` từ `lib/date-utils.ts`. Đảm bảo `todayString()` sử dụng `Asia/Ho_Chi_Minh` timezone. Recurring sync phải dùng `todayString()` thay vì naive `toISOString().split('T')[0]`.

**Test**: 00:30, 06:30, 23:30 Asia/Ho_Chi_Minh — occurrence không bị lệch sang ngày UTC trước đó.

---

### [SYNC-01] [HIGH] Streak Fix — Centralized Helper

**File**: `lib/chinese-stats.ts`, `app/(app)/chinese/journal/page.tsx`

**Behavior chuẩn**:
- Có session hôm nay → start count từ today, lùi về quá khứ.
- Không có session hôm nay nhưng có hôm qua → start count từ yesterday, lùi về quá khứ.
- Không có cả hôm nay và hôm qua → streak = 0.

**Giải pháp**: Tạo một canonical helper `calculateStreak(sessionDates: string[]): number` trong `lib/chinese-stats.ts`. Dùng `todayString()` cho timezone-safe. `JournalPage` import và sử dụng helper thay vì tính streak riêng.

**Test**: today only, yesterday only, today + yesterday, 3 consecutive ending yesterday, gap yesterday, duplicate sessions same day.

---

### [EVT-01] [HIGH] Data Changed Events — Completeness & Stability

**Files**: 9 page files + `calendar/page.tsx`

**Giải pháp**:
1. Thêm `import { notifyDataChanged } from '@/lib/events'` và gọi SAU mutation thành công ở:
   - `expenses/page.tsx`: `notifyDataChanged('expenses', 'transaction')` — add/edit/delete
   - `expenses/recurring/page.tsx`: `notifyDataChanged('expenses', 'recurring')` — add/edit/delete/toggle
   - `expenses/categories/page.tsx`: `notifyDataChanged('expenses', 'category')`
   - `expenses/budget/page.tsx`: `notifyDataChanged('expenses', 'budget')`
   - `chinese/journal/page.tsx`: `notifyDataChanged('chinese', 'journal')`
   - `chinese/lessons/page.tsx`: `notifyDataChanged('chinese', 'lesson')`
   - `chinese/grammar/page.tsx`: `notifyDataChanged('chinese', 'grammar')`
   - `fitness/goals/page.tsx`: `notifyDataChanged('fitness', 'goals')`
2. `calendar/page.tsx`: thêm `useDataChanged('all', loadMonthEvents)` — sử dụng `useCallback` để ổn định callback reference tránh remove/add listener không cần thiết.
3. Quy tắc: CHỈ dispatch SAU mutation thành công. Không dispatch nếu operation fail.
4. Sau bulk restore: chỉ emit `notifyDataChanged('all', 'restore')` một lần duy nhất.

---

### [DATA-01] [HIGH] Versioned Full Export & Transactional Safe Restore

**File**: Tạo `lib/backup.ts`, tạo `app/api/restore/route.ts` (server boundary), sửa `app/(app)/settings/page.tsx`

**Export**:
- Backup JSON format:
  ```json
  {
    "format": "mochi-life-backup",
    "schema_version": 1,
    "app_version": "4.0.0",
    "exported_at": "2026-08-14T14:00:00+07:00",
    "storage_note": "Database backup does not include uploaded binary files (avatar, weight photos, receipt images).",
    "data": {
      "hsk_courses": [...],
      "transactions": [...],
      ...
    }
  }
  ```
- Filename: `mochi-life-backup-YYYY-MM-DD.json`
- Pagination helper `fetchAllRows()` — Supabase client default 1000 rows limit → loop with range pagination.
- Không hard-code số bảng. Dùng danh sách bảng từ Canonical Inventory.

**Restore — Transactional tại Database Boundary**:
```
Client:
  1. Parse JSON
  2. Validate format + schema_version
  3. Validate cấu trúc data
  4. Hiển thị summary (số records)
  5. Yêu cầu nhập "KHOI PHUC" để xác nhận
  ↓
Server API route (authenticated):
  6. Re-validate file server-side
  7. Gọi Supabase RPC restore function
  ↓
Database RPC (SECURITY DEFINER):
  8. BEGIN TRANSACTION
  9. DELETE current user data (23 bảng, cascade)
  10. INSERT backup data theo dependency order
  11. Override all user_id → auth.uid() (KHÔNG tin tưởng embedded user_id)
  12. Map user_achievements bằng achievement.code, không bằng UUID
  13. Remap internal UUIDs (courses, lessons, vocab → vocabulary_reviews...) với deterministic mapping
  14. COMMIT (nếu mọi thứ OK)
  15. ROLLBACK nếu bất kỳ bước nào fail → data cũ nguyên vẹn
```

**Restore Mode**: "Replace current user data" — Không đụng `auth.users`, email, password, authentication credentials.

**Test**: invalid schema rejected, unsupported version rejected, FK restored đúng, user_id rewritten, partial failure → rollback, data cũ nguyên sau fail, thành công → record counts đúng.

---

### [AI-02] AI Rate Limit Decision

**File**: `lib/ai/rate-limit.ts`

**Audit**: Hiện tại dùng in-memory `Map<string, {count, windowStart}>` với cleanup mỗi 1h. Trên Vercel serverless, Map reset mỗi cold start → rate limit không reliable.

**Decision: Option A — Giữ best-effort in-memory**.

**Rationale**: Đây là personal app. Rate limit chỉ cần ngăn chặn lỗi loop/spam cơ bản, không cần enforce precise per-user limits. Persistent rate limiting (Supabase, Redis) là overengineering cho 1 user. In-memory Map đủ cho per-instance protection. Ghi rõ trong documentation.

---

### [GAME-01] [MEDIUM] XP Triggering & Idempotency

**File**: `lib/gamification.ts`, various pages

**Giải pháp**: Gọi `awardXP` với `reference_id` format chuẩn:
- Hoàn thành buổi tập: +20 XP, ref `exercise:create:<id>`
- Ghi cân nặng: +10 XP, ref `weight:create:<date>`
- Ghi buổi học: +15 XP, ref `study:create:<date>`
- Quiz: +25 XP, ref `quiz:<timestamp>`
- Giao dịch: +5 XP, ref `transaction:create:<id>`

DB unique constraint `(user_id, action_type, reference_id) WHERE reference_id IS NOT NULL` đảm bảo idempotency ở database level.

**Test**: same reference twice → XP once, different references → XP twice.

---

### [DB-01] [MEDIUM] Performance Indexes — Justified Only

**Audit index hiện tại** (xem Section 2 — comprehensive list).

**Indexes cần thêm** (chỉ những cái chưa tồn tại và có query pattern thực tế):
- `idx_transactions_recurring_id ON transactions(recurring_id)` — recurring sync query joins on this, currently only partial unique index exists.
- `idx_study_sessions_user_date ON study_sessions(user_id, session_date)` — ĐÃ CÓ `idx_study_sessions_user_date(user_id, session_date DESC)` → **KHÔNG thêm duplicate**.
- `idx_user_xp_logs_idempotency` — đã nêu trong SEC-03.
- `idx_hsk_lessons_user_course ON hsk_lessons(user_id, course_id)` — lessons query luôn filter theo user + course.

**KHÔNG thêm**: indexes đã được cover bởi existing composite indexes hoặc unique constraints.

---

### [PK-01] [MEDIUM] ESLint Setup & Quality Scripts

**Vấn đề**: Next.js 16 đã loại bỏ `next lint`. Project không có ESLint. `next typegen` tồn tại và hỗ trợ.

**Giải pháp**:
1. Install devDependencies: `eslint`, `eslint-config-next`
2. Tạo `eslint.config.mjs`:
   ```js
   import { defineConfig, globalIgnores } from 'eslint/config'
   import nextVitals from 'eslint-config-next/core-web-vitals'
   import nextTs from 'eslint-config-next/typescript'

   const eslintConfig = defineConfig([
     ...nextVitals,
     ...nextTs,
     globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
   ])
   export default eslintConfig
   ```
3. `package.json` scripts:
   ```json
   "typecheck": "next typegen && tsc --noEmit",
   "lint": "eslint ."
   ```

---

## 5. PHÂN CHIA GIAI ĐOẠN TRIỂN KHAI

### Phase 0 — Baseline & Audit (ĐÃ HOÀN THÀNH)
- [x] Audit toàn bộ repository
- [x] Baseline test / typecheck / build
- [x] Schema inventory & dependency graph
- [x] Backup table inventory
- [x] Security inventory
- [x] Tạo `IMPROVEMENT_PLAN.md` v2

### Phase 1 — Critical Security
- [ ] [SEC-01] Import URL: auth + full SSRF redirect hardening + streaming size limit + safe error messages
- [ ] [SEC-02] Migration: Replace `check_and_unlock_achievements` RPC — add `auth.uid()` guard + REVOKE/GRANT
- [ ] [SEC-03] Migration: XP idempotency unique constraint + amount cap CHECK + harden RLS

### Phase 2 — Core Reliability
- [ ] [AI-01] Gemini timeout: native `abortSignal` + `httpOptions.timeout` + cleanup + friendly fallback
- [ ] [TS-01] Fix TypeScript compilation errors in reactions.test.ts
- [ ] [REC-01] Migration: Add `anchor_day`, `anchor_month` to `recurring_transactions` + backfill
- [ ] [REC-02] Recurring sync: phân biệt 23505 vs network error, không advance khi fail
- [ ] [REC-03] Recurring sync timezone: dùng `todayString()` centralized
- [ ] [SYNC-01] Streak fix: canonical helper + timezone-safe
- [ ] [EVT-01] notifyDataChanged cho 9 pages + useDataChanged cho Calendar + useCallback stability

### Phase 3 — Data Protection
- [ ] [DATA-01] `lib/backup.ts`: versioned full export (23 bảng + pagination)
- [ ] [DATA-01] `app/api/restore/route.ts`: server-side restore endpoint
- [ ] [DATA-01] Migration: Restore RPC (transactional, dependency-ordered, user_id rewrite, achievement code mapping)
- [ ] [DATA-01] Settings page: export/restore UI + strong confirmation ("KHOI PHUC")

### Phase 4 — Gamification Integrity
- [ ] [GAME-01] Wire `awardXP` vào exercise, weight, study, quiz, transaction pages
- [ ] [GAME-01] Idempotency via DB constraint + reference_id format

### Phase 5 — Database Performance
- [ ] [DB-01] Migration: justified indexes only (after confirming no duplicates)

### Phase 6 — Tests & Code Quality
- [ ] Install ESLint + eslint-config-next, tạo eslint.config.mjs
- [ ] Bổ sung scripts typecheck + lint vào package.json
- [ ] Test suites: SSRF, recurring-sync, streak, gamification, backup/restore, AI timeout, date-utils, format
- [ ] Fix any lint errors discovered

### Phase 7 — Documentation
- [ ] README: migration count thực tế, backup/restore behavior, security notes, lint/typecheck commands
- [ ] `IMPROVEMENT_REPORT.md`

### Phase 8 — Final QA
```bash
npm test
npm run typecheck
npm run lint
npm run build
```
Tất cả PHẢI PASS.

---

*Kế hoạch này đã được cập nhật theo review feedback. Implementation bắt đầu ngay sau khi lưu.*
