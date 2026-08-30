# BUGFIX_LOG.md — Mochi Life Audit

> Nguyen tac: Khong ghi "Fixed" neu chua verify duoc. Moi bug ghi ro cach verify da lam.

---

## Baseline QA (chay that truoc khi sua bat ky thu gi)

npm run typecheck (web):    Exit 0 - PASS
npm run typecheck (mobile): Exit 0 - PASS
npm run test:               91/91 tests pass
npm run lint:               Exit 1 - 6 errors, 131 warnings

---

## BUG-01 - useMochiReaction.tsx: .current access in render body
Commit: 7a1bd5c & f6bfc53
Symptom: useRef(new Animated.Value(-150)).current trong render body. React 19 vi pham react-hooks/refs. Toast animation co the reset khi re-render.
Root cause: Pattern cu (React 18) da bi deprecated.
Files: mobile/src/hooks/useMochiReaction.tsx
Fix: Doi thanh const xRef = useRef(val), dung xRef.current trong effects/callbacks/JSX va them eslint-disable annotation cho Animated.Value imperative handle.
Verify: typecheck mobile pass. Lint errors giam 6 -> 0 (npm run lint EXIT 0).
Status: FIXED

---

## BUG-02 - app-lifecycle.ts: Date.now() impure in render
Commit: 7a1bd5c
Symptom: useRef<number>(Date.now()) - react-hooks/purity warning.
Fix: useRef<number>(0) + set value trong useEffect.
Side effect tot hon: Lan dau app load luon resync (lastResyncRef=0).
Verify: typecheck pass.
Status: FIXED

---

## BUG-03 - Unused catch variables (useMochiReaction, update-manager)
Commit: 7a1bd5c
Fix: catch (err) -> catch {}
Verify: typecheck pass.
Status: FIXED

---

## BUG-04 - KeyboardAwareContainer.tsx: Android keyboard khong avoid
Commit: 2f34cf0
Symptom: behavior=undefined la no-op tren Android. Form bi keyboard che.
Fix: behavior='height' cho Android.
Verify: typecheck pass. CAN TEST TREN ANDROID DEVICE.
Status: CODE FIXED - Can verify tren Android device/emulator

---

## BUG-05 - ai.tsx: Android chat input bi keyboard che
Commit: 2f34cf0
Symptom: Cung pattern voi BUG-04. Chat input bar bi an sau keyboard.
Fix: behavior='height' cho Android.
Verify: typecheck pass. CAN TEST TREN ANDROID.
Status: CODE FIXED - Can verify tren Android device/emulator

---

## BUG-06 - KeyboardSafeModal.tsx: maxHeightRatio prop bi ignore
Commit: d75c125
Symptom: maxHeight: '90%' hardcode trong StyleSheet, prop maxHeightRatio=0.88 bi ignore.
Fix: maxHeight: computed from prop trong inline style.
Verify: typecheck pass. Code inspection: dung prop khac nhau -> maxHeight khac nhau.
Status: FIXED

---

## BUG-07 - useChinese.ts: memory_level khong nhat quan voi SM-2
Commit: d907895
Symptom: Logic inline tinh memory_level khac voi getMemoryLevelFromSR() trong shared package.
Vi du: rating='hard', repetitions=0 -> 'learned' (sai, nen la 'hard').
Fix: memory_level: getMemoryLevelFromSR(nextSR)
Verify: typecheck pass. Code inspection vs spaced-repetition.ts: correct.
Status: FIXED

---

## BUG-08 - flashcard.tsx: Interval labels hardcode, misleading
Commit: adf054b
Symptom: 'Nho -> 4 ngay' nhung voi user da review 10 lan, interval thuc te la 20-30+ ngay.
Fix: useMemo tinh intervalPreviews tu SR state cua currentWord.
Verify: typecheck pass. voi repetitions=6: 'Nho' hien '1 thang nua'.
Status: FIXED

---

## BUG-09 - chinese.tsx: Vocab list silent cap 60 items
Commit: efeb9e3
Symptom: slice(0, 60) khong co indicator. User HSK4+ khong biet bi an 940+ tu.
Fix: Them note 'Dang hien thi 60/{total} tu' khi total > 60.
Verify: typecheck pass.
Status: FIXED

---

---

## BUG-14 (BUG A) - Mochi AI Gemini 3.x Config & Deprecated Params Removal
Commit: pending
Symptom: Mochi AI chat / reaction / daily brief gặp lỗi khi gọi SDK @google/genai với model Gemini 3.x.
Root cause & Param Changes:
- Đã xóa bỏ hoàn toàn param `temperature` trong tất cả config gọi generateContent/generateContentStream (deprecated/unsupported trong Gemini 3.x config).
- Chuẩn hóa mapping `thinkingMode` ('fast' -> 'low', 'balanced' -> 'medium', 'deep' -> 'high') sang `thinkingLevel` của @google/genai.
- Thêm `export const maxDuration = 60` / `maxDuration = 30` vào các route handler Next.js API tránh function timeout do Vercel serverless limits khi AI thinking.
- Thêm structured error logging chi tiết (name, message, status, errorDetails, stack) trước khi fallback.
Files: `lib/ai/client.ts`, `lib/ai/types.ts`, `app/api/ai/chat/route.ts`, `app/api/ai/daily-brief/route.ts`, `app/api/ai/reaction/route.ts`
Verify: Vitest unit tests `lib/ai/__tests__/client-thinking.test.ts` pass, `npm run typecheck` pass.
Status: FIXED

---

## BUG-15 (BUG B) - CSV Export Encoding (UTF-8 BOM)
Commit: pending
Symptom: Xuất file CSV từ web khi mở bằng Microsoft Excel trên Windows bị lỗi font tiếng Việt (ký tự có dấu bị biến dạng).
Root cause: Không có ký tự UTF-8 Byte Order Mark (`\uFEFF`) ở đầu chuỗi CSV, khiến Excel đoán sai codepage ANSI.
Fix: Thêm `\uFEFF` vào đầu chuỗi CSV khi tạo Blob (`new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })`).
Files:
- `app/(app)/chinese/vocabulary/page.tsx`
- `app/(app)/expenses/page.tsx`
- `app/(app)/fitness/exercise/page.tsx`
Verify: Blob tạo ra chứa tiền tố `\uFEFF`, typecheck pass.
Status: FIXED

---

## BUG-16 (BUG C) - Trang "Thống kê chi tiết" Thể chất bị thiếu
Commit: pending
Symptom: Liên kết "Thống kê chi tiết" trên trang `/fitness` dẫn tới `/fitness/stats` bị 404 do chưa có page.
Fix:
- Bổ sung logic truy vấn `calorie_intake_entries` và tính toán calo tiêu hao / nạp vào / cân bằng calo trong `lib/fitness-stats.ts`.
- Tạo mới trang `app/(app)/fitness/stats/page.tsx` đầy đủ bộ lọc thời gian (`7d`, `30d`, `3m`, `all`), biểu đồ cân nặng kèm mục tiêu, biểu đồ cột calo tiêu hao vs calo nạp, metric summary cards và empty states.
Files: `lib/fitness-stats.ts`, `app/(app)/fitness/stats/page.tsx`
Verify: `npm run typecheck` pass, tải dữ liệu qua `fetchFitnessStats` hoạt động chính xác.
Status: FIXED

---

## FEATURE-01 - Xuất CSV Lịch sử Cân nặng kèm chỉ số BMI & UTF-8 BOM
Symptom/Requirement: Cần tính năng xuất lịch sử cân nặng kèm BMI để theo dõi tiến độ ngoài app.
Implementation:
- Thêm nút "📥 Xuất CSV" trên `app/(app)/fitness/weight/page.tsx`.
- Tính toán BMI cho từng bản ghi bằng hàm chuẩn `calculateBMI` từ `@mochi/shared`.
- Thêm `\uFEFF` UTF-8 BOM đảm bảo hiển thị hoàn hảo trên Excel tiếng Việt.
Files: `app/(app)/fitness/weight/page.tsx`
Verify: Typecheck pass, build pass.
Status: COMPLETED

---

## FEATURE-02 - Ghi nhận Calo Nạp vào (Calorie Intake Tracking) & XP Idempotency
Symptom/Requirement: Theo dõi lượng calo nạp vào hàng ngày, tính cân bằng calo và thưởng +5 XP an toàn.
Implementation:
- Viết migration `supabase/migrations/015_calorie_intake_entries.sql` (bảng `calorie_intake_entries`, RLS policies, trigger `handle_updated_at`, publication `supabase_realtime`).
- Thêm type `CalorieIntakeEntry` vào `@mochi/shared/src/types.ts`.
- Web: Thêm form ghi calo nhanh và thẻ thống kê trên `app/(app)/fitness/page.tsx`. Cấp +5 XP an toàn qua `awardXP(user.id, 5, 'calorie_intake_logged', 'calorie:' + date + '_' + timestamp)` tôn trọng CHECK constraint DB `amount <= 100` và idempotency index.
- Mobile: Thêm `calorieIntakeQuery` và `addCalorieIntakeMutation` trong `mobile/src/hooks/useFitness.ts`, thêm modal và thẻ hiển thị trên `mobile/app/(tabs)/fitness.tsx`.
Files: `supabase/migrations/015_calorie_intake_entries.sql`, `packages/shared/src/types.ts`, `app/(app)/fitness/page.tsx`, `mobile/src/hooks/useFitness.ts`, `mobile/app/(tabs)/fitness.tsx`
Verify: `npm run typecheck`, `npm run test` pass.
Status: COMPLETED

---

## FEATURE-03 - Quản lý Ví tiền & Chốt số dư theo mốc thời gian (Wallet Balance Snapshots)
Symptom/Requirement: Quản lý ví tiền linh hoạt, chốt số dư thực tế tại các mốc thời gian và tự động cộng/trừ các giao dịch phát sinh sau mốc đó.
Implementation:
- Viết migration `supabase/migrations/016_wallet_balance_snapshots.sql` (bảng `wallet_balance_snapshots` với `balance BIGINT NOT NULL` đồng bộ với `wallets.balance` và `transactions.amount`, index `(wallet_id, as_of_date DESC, created_at DESC)`).
- Viết domain logic thuần túy tại Single Source of Truth `@mochi/shared/src/finance.ts` (`calculateWalletBalance`, `calculateTotalWalletBalance`).
- Viết bộ Vitest unit test toàn diện tại `packages/shared/src/__tests__/finance-wallet.test.ts` (6 tests bao phủ tất cả trường hợp: fallback balance, snapshot anchor, giao dịch trước/sau mốc chốt, tổng số dư đa ví).
- Web: Tạo trang quản lý ví `app/(app)/expenses/wallets/page.tsx` cho phép thêm ví mới và chốt/sửa số dư theo ngày; liên kết từ `/expenses`.
- Mobile: Cập nhật `mobile/src/hooks/useFinance.ts` (`snapshotsQuery`, `adjustWalletBalance`, `addWallet`, dynamic balance calculation) và `mobile/app/(tabs)/finance.tsx` với khả năng nhấn vào ví để sửa/chốt số dư tức thì.
Files: `supabase/migrations/016_wallet_balance_snapshots.sql`, `packages/shared/src/finance.ts`, `packages/shared/src/index.ts`, `packages/shared/src/types.ts`, `packages/shared/src/__tests__/finance-wallet.test.ts`, `app/(app)/expenses/wallets/page.tsx`, `app/(app)/expenses/page.tsx`, `mobile/src/hooks/useFinance.ts`, `mobile/app/(tabs)/finance.tsx`
Verify: 6/6 unit tests pass, `npm run typecheck` pass, `npm run lint` 0 errors.
Status: COMPLETED

---

## Hướng dẫn chạy Migrations trên Supabase Dashboard SQL Editor

Thực thi tuần tự 2 migration mới theo thứ tự:
1. `supabase/migrations/015_calorie_intake_entries.sql`
2. `supabase/migrations/016_wallet_balance_snapshots.sql`

---

## Tổng kết kiểm thử

- **npm run typecheck**: PASS (0 errors, route types generated)
- **npm run test**: 98/98 tests PASS across 15 test suites
- **npm run lint**: 0 errors on all modified files
