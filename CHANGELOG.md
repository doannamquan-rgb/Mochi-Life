# 📜 Nhật ký cập nhật (Release Notes & Changelog)

Tất cả các thay đổi và tính năng mới của dự án **Mochi Life** sẽ được ghi nhận chi tiết tại đây.

---

## 🌟 [v6.1.0] - 2026-08-17 — 🛡️ FULL MOBILE STABILIZATION & PARITY HARDENING

> *"Ổn định toàn diện Mobile, Giao dịch tài chính nguyên tử (Atomic RPC), Đồng bộ Realtime 14 bảng, AI Thinking Modes, Khóa học tiếng Trung chuẩn hóa & Quản lý cập nhật OTA"*

### 🛡️ 1. Tài Chính Nguyên Tử & Chống Lệch Số Dư Ví (Atomic Finance RPC)
- **Migration 014**: Chuyển toàn bộ thao tác thêm/xóa giao dịch thành PostgreSQL Stored Procedure nguyên tử (`record_transaction_atomic` & `delete_transaction_atomic`) với khóa dòng `FOR UPDATE`.
- Loại bỏ hoàn toàn race condition và tình trạng ghi đè số dư giữa Web và Mobile.
- Tách riêng câu truy vấn tổng hợp tháng theo date range, khắc phục triệt để lỗi thống kê bị cắt ngắn do giới hạn danh sách 50 giao dịch.

### 🈶 2. Chuẩn Hóa Khóa Học Tiếng Trung & Course Switcher
- Thống nhất nguồn chân lý (Source of truth) khóa học hoạt động theo `user_profiles.active_hsk_course_id`.
- Tích hợp Modal chuyển đổi khóa học (Course Switcher) trên mobile, đồng bộ hai chiều tức thì với Web.
- Tự động fallback cho dữ liệu từ vựng cũ (`course_id IS NULL`).
- Tích hợp ghi nhận phiên học và cộng điểm XP khi hoàn thành Flashcard (SM-2) và Quiz trắc nghiệm.

### 🤖 3. Mochi AI Assistant (Gemini 3.7 Flash) & Smart Reactions
- Bổ sung 3 chế độ suy luận: `⚡ Siêu tốc` (fast), `⚖️ Cân bằng` (balanced), và `🧠 Suy luận sâu` (deep).
- Lưu chế độ ưa thích vào `AsyncStorage` và quản lý hủy request bằng `AbortController`.
- Hiển thị bong bóng lỗi thân thiện (401/429/500/mạng) kèm nút "Thử lại" một chạm.
- Hệ thống Floating AI Reactions (`useMochiReaction`) tự động chúc mừng và động viên người dùng sau mỗi thao tác.

### 🔄 4. Realtime Sync Toàn Diện (14 Bảng) & AppState Lifecycle
- Mở rộng kênh `supabase_realtime` lắng nghe toàn bộ 14 bảng người dùng với bộ lọc `user_id`.
- Quản lý vòng đời `AppState` (`useAppLifecycleResync`) tự động kiểm tra phiên và làm mới dữ liệu khi mở lại ứng dụng (debounce 15 giây).

### 📱 5. Tối Ưu Bàn Phím & Trải Nghiệm Biểu Mẫu (Keyboard-Safe UX)
- Xây dựng `KeyboardSafeModal` và `KeyboardAwareContainer` đảm bảo toàn bộ form nhập liệu, danh mục và nút bấm không bị che khuất trên Android.
- Khắc phục lỗi BMI silent fallback (không tự động gán 170cm, hướng dẫn người dùng cập nhật trong Cài đặt).
- Bổ sung chức năng chỉnh sửa hồ sơ (Tên hiển thị, Chiều cao) trong Cài đặt.

### 🚀 6. Hệ Thống Cập Nhật OTA (EAS Update Manager)
- Tích hợp `useAppUpdates` hook và `UpdateBanner` thông báo khi có bản cập nhật mới được tải về.
- Thêm bảng điều khiển phiên bản và nút "Kiểm tra cập nhật" trực tiếp trong Cài đặt.

---

## 🌟 [v6.0.0] - 2026-08-17 — 🚀 THE CROSS-PLATFORM REVOLUTION (BIG UPDATE)

> *"Một sản phẩm, hai Client — Trải nghiệm Kawaii đỉnh cao từ Web Next.js đến Native Android Expo"*

### 📱 1. Ra Mắt Ứng Dụng Mobile Android Native Riêng Biệt (`/mobile`)
- **Công nghệ Native Đỉnh Cao**: Xây dựng hoàn toàn bằng **Expo SDK 57**, **React Native 0.86.2**, **React 19.2**, và **Expo Router v5**.
- **Hermes Bytecode Engine**: Tối ưu hóa hiệu năng khởi động tức thì, mượt mà 60–120 FPS trên mọi thiết bị Android.
- **Bộ Nhận Diện Thương Hiệu Mới**: Icon chú mèo Mochi Kawaii siêu sắc nét (1024x1024px Adaptive Icon, hỗ trợ mọi launcher bo góc, Dynamic Splash Screen).
- **Hệ Thống Màn Hình Native Đầy Đủ**:
  - 🏠 **Dashboard**: Theo dõi Level, thanh tiến trình XP, Chuỗi Streak ngọn lửa, chỉ số nhanh và Danh sách việc cần làm (Checklist).
  - 💰 **Finance (Quản lý Tài chính)**: Quản lý đa ví tiền mặt/ngân hàng, ghi chép Thu/Chi trực quan, cập nhật số dư tức thì.
  - 💪 **Fitness (Sức khỏe & Cân nặng)**: Theo dõi cân nặng & biểu đồ BMI tự động, ghi nhật ký luyện tập 11 môn thể thao với thuật toán ước tính calo chuẩn y khoa.
  - 🈶 **Chinese (Học Tiếng Trung & HSK)**: Danh mục khóa học, từ vựng chuẩn HSK, Flashcard lật thẻ tương tác 3D tích hợp thuật toán **SM-2 Spaced Repetition**, và chế độ Quiz trắc nghiệm tính điểm.
  - 🤖 **Mochi AI Companion**: Trò chuyện thông minh cùng Mochi AI (Gemini 3.7 Flash), tóm tắt ngày Daily Briefing với lời khuyên cá nhân hóa.
  - 🏆 **Gamification & Achievements**: Mở khóa và vinh danh hơn 25+ huy hiệu Master danh giá trên trang cá nhân.

---

### 📦 2. Kiến Trúc Monorepo `@mochi/shared` — Single Source of Truth
- Tách rời toàn bộ logic tính toán cốt lõi thành package nội bộ độc lập `@mochi/shared`:
  - 🧠 **SM-2 SRS Algorithm**: Thuật toán lặp lại ngắt quãng tiêu chuẩn quốc tế.
  - ⚖️ **BMI & Calorie Calculation**: Công thức chỉ số khối cơ thể và tiêu thụ năng lượng.
  - 🎮 **Gamification Engine**: Bảng tra cứu XP, Level scaling curve, hệ thống huy hiệu Master.
  - 🔥 **Streak Tracker**: Thuật toán tính chuỗi ngày liên tiếp thông minh.
  - 💵 **Formatters**: Định dạng tiền tệ VND & ngày tháng quốc tế.
- Đảm bảo **100% tính nhất quán dữ liệu** giữa Web và Mobile — sửa một nơi, áp dụng toàn hệ sinh thái!

---

### 🔐 3. Dual-Auth Enterprise Server Security
- **`getAuthenticatedUser(request)`**: Bộ xử lý xác thực thông minh tại lớp Server API (`/api/ai/*`):
  - Nhận diện song song **Web SSR Cookie** và **Mobile Bearer JWT**.
  - **Zero-Trust Client Payload**: Tuyệt đối không tin cậy `user_id` từ body client gửi lên, xác thực danh tính trực tiếp qua chữ ký mật mã Supabase Auth.
- **An Toàn Tuyệt Đối**: 0 Secret hay Private Key nào bị nhúng vào client Mobile (`EXPO_PUBLIC_*` chỉ chứa public URL/anon key).

---

### 🔄 4. Selective Realtime Database Sync
- Kích hoạt cơ chế lắng nghe Realtime thông minh trên 8 bảng dữ liệu quan trọng (`transactions`, `weight_logs`, `exercise_logs`, `hsk_vocabulary`, `study_sessions`, `daily_checklists`, `user_xp_logs`, `user_achievements`).
- Dữ liệu thêm/sửa trên Web lập tức phản chiếu lên Mobile theo thời gian thực mà không cần reload app!

---

### 📊 5. Đảm Bảo Chất Lượng & Kiểm Thử Toàn Diện (Zero Regression)
- ✅ **84/84 Unit Tests Passed (100%)** qua Vitest.
- ✅ **0 Lỗi TypeScript (`tsc --noEmit`)** trên toàn bộ 3 workspace (`root`, `mobile`, `packages/shared`).
- ✅ **0 Lỗi Linter** trên mã nguồn mới.
- ✅ **Biên dịch thành công 38/38 Next.js Web Routes** và **Hermes JS Android Bundle**.

---

## 🚀 [v4.6.0] - 2026-08-16

### 🧠 Tùy chỉnh Thinking Level & Tối ưu Trợ lý Mochi AI (Gemini 3.7 Flash)

#### 1. ⚡ Bộ chọn Chế độ Suy nghĩ (Thinking Mode Selector)
- **3 Chế độ linh hoạt**:
  - **⚡ Siêu tốc (Fast)**: Tắt suy nghĩ (`thinkingBudget = 0`), phản hồi tức thì với độ trễ thấp nhất cho các câu hỏi ngắn và giao tiếp nhanh.
  - **⚖️ Cân bằng (Balanced)**: Gemini tự động điều chỉnh ngân sách suy luận theo mức độ phức tạp (Mặc định).
  - **🧠 Suy luận sâu (Deep Reasoning)**: Cấp ngân sách `8192` token suy nghĩ để phân tích chi tiết dữ liệu học tập, calo và tài chính đa chiều.
- **Trang Chat Mochi AI (`app/(app)/ai/page.tsx`)**: Tích hợp thanh chọn Segmented Pills trực quan trên header, ghi nhớ tùy chọn vào `localStorage`, và hiển thị trạng thái loading tương ứng.
- **Trang Cài đặt (`app/(app)/settings/page.tsx`)**: Bổ sung mục chọn chế độ AI Thinking mặc định và nâng phiên bản hệ thống lên `4.6.0`.

#### 2. ⚙️ Tích hợp SDK Backend (`lib/ai/client.ts`, `app/api/ai/chat/route.ts`)
- Hỗ trợ truyền `thinkingConfig` native vào SDK `@google/genai` v2.16.0.
- Bổ sung biến môi trường cấu hình tùy chọn `GEMINI_THINKING_BUDGET`.

---

## 🚀 [v4.5.0] - 2026-08-14

### 🛡️ Nâng cấp Bảo mật, Tính ổn định Toàn diện & Hệ thống Sao lưu Khôi phục (Enterprise Reliability & Security)

#### 1. 🛡️ Bảo mật Hệ thống & API
- **SSRF Protection Đa tầng (`/api/import/url`)**: Thêm xác thực người dùng server-side, vòng lặp xử lý manual redirect tối đa 5 hops có xác thực DNS/IP tại từng chặng, chặn toàn bộ dải IP private/loopback/link-local/IPv4-mapped-IPv6/AWS metadata và giới hạn kích thước stream 5MB.
- **Bảo mật Hàm RPC (`008_security_hardening_rpc.sql`)**: Bổ sung `auth.uid()` guard cho `check_and_unlock_achievements`, thu hồi quyền execute từ `public/anon`, chỉ cấp phép cho `authenticated`.
- **Toàn vẹn Dữ liệu XP (`009_xp_idempotency_and_integrity.sql`)**: Ràng buộc `CHECK (amount > 0 AND amount <= 100)` và Unique Partial Index chống trùng lặp ghi nhận XP.

#### 2. 🐱 Trợ lý Mochi AI — Timeout & Cancellation Native
- **Tối ưu SDK Gemini (`lib/ai/client.ts`)**: Sử dụng native `abortSignal` và `httpOptions.timeout` từ `@google/genai` v2.16.0, tự dọn dẹp timer và trả về thông điệp dễ thương khi timeout.

#### 3. 💰 Giao dịch định kỳ & Chuỗi ngày học
- **Chống trôi ngày giao dịch định kỳ (`010_recurring_anchor.sql`, `lib/recurring-sync.ts`)**: Bổ sung `anchor_day` và `anchor_month` kèm thuật toán bù ngày neo thông minh (Jan 31 → Feb 28 → Mar 31). Không làm nhảy ngày nếu gặp lỗi insert ngoại trừ mã `23505`.
- **Chuỗi học liên tục (Streak) Chuẩn xác (`lib/chinese-stats.ts`)**: Viết hàm canonical `calculateStreak` bảo lưu streak nếu hôm nay chưa kịp học nhưng hôm qua có học, đồng bộ theo múi giờ Việt Nam.

#### 4. 💾 Sao lưu & Khôi phục Dữ liệu Toàn diện (Backup & Transactional Restore)
- **Sao lưu 23 bảng (`lib/backup.ts`)**: Xuất toàn bộ dữ liệu người dùng ra JSON chuẩn hóa với phân trang `fetchAllRows` vượt giới hạn 1.000 dòng.
- **Khôi phục Transactional (`011_transactional_restore_rpc.sql`, `/api/restore`, `settings/page.tsx`)**: Khôi phục dữ liệu nguyên tử phía database, ghi đè `user_id` an toàn, map thành tích theo code và hộp thoại xác nhận yêu cầu nhập `"KHOI PHUC"`.

#### 5. 🔄 Custom Events & Gamification
- Đồng bộ dữ liệu realtime qua `notifyDataChanged` / `useDataChanged` trên 100% các trang CRUD và Lịch biểu.
- Tự động tích lũy XP (+5 đến +25 XP) cho 5 hoạt động người dùng.

#### 6. 🧪 Kiểm thử & Chất lượng Code
- Cấu hình ESLint Flat Config (`eslint.config.mjs`) chuẩn Next.js 16.
- Bổ sung 6 bộ unit test mới: **78 tests pass / 11 test suites**.

---

## 🚀 [v4.0.0] - 2026-08-10

### 🌟 Mochi AI Coach — Personal Life Assistant 🐱
- AI integration with Gemini, read-only assistant, Daily Brief, study/fitness/finance context
- Note: Read-only AI, no database write actions yet

---

## 🚀 [v3.1.1] - 2026-07-31

### 🛠️ Sửa lỗi Tương thích Vercel & Kiểm tra An toàn Biến Môi trường (Vercel Stability Fix)
- **Kiểm tra an toàn Middleware (`proxy.ts`)**: Thêm cơ chế kiểm tra biến môi trường `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY` cùng khối `try-catch` để chống lỗi **500 Internal Server Error** trên Vercel.
- **Tối ưu hóa Supabase Client SSR**: Thêm giá trị fallback an toàn cho `createBrowserClient` và `createServerClient` khi biến môi trường chưa được thiết lập trên Vercel Dashboard.
- **Tương thích hoàn toàn với Vercel Deployment**: Loại bỏ xung đột cấu hình middleware giữa Next.js 16 và các phiên bản triển khai trên serverless Edge.

---

## 🚀 [v3.1.0] - 2026-07-31

### 🌟 Nâng cấp UX/UI Thêm/Sửa & Nút AssistiveTouch Kéo Thả (Add/Edit Focused UX & Draggable FAB)

#### 1. 🏃 Nâng cấp Form Thêm/Sửa Nhật ký Luyện tập (Fitness Exercise UX Upgrade)
- **Chế độ nhập liệu tập trung (Focused Entry Mode)**: Chuyển đổi form từ dạng modal popup sang dạng thẻ inline mượt mà. Ẩn hoàn bộ danh sách lịch sử & empty-state khi đang mở form.
- **Thẻ chọn Loại bài tập & Cường độ (Radio Cards)**: Thay thế danh sách nút văn bản đơn điệu bằng các thẻ radio chuẩn accessibility (`<fieldset>`) có icon, tiêu đề, đường viền nổi bật, background màu ngữ nghĩa và dấu tích `✓` trực quan.
- **Ước tính Calo thông minh (2 Chế độ)**: Tích hợp chế độ `✨ Ước tính tự động` (tính theo thời gian, loại bài tập và cường độ Nhẹ/Vừa/Cao) và chế độ `✍️ Tự nhập`.
- **Hiển thị trường linh hoạt**: Tự động hiển thị/ẩn trường quãng đường (km) và số bước tùy thuộc vào loại bài tập (Đi bộ, Chạy bộ, Đạp xe, Bơi, Gym...).

#### 2. 🔤 Nâng cấp Form Thêm/Sửa Từ vựng & Quản lý Trạng thái Học (Chinese Vocab UX Upgrade)
- **Thẻ chọn Trạng thái học (`Chưa học` / `Đã học`)**: Phân định rõ ràng từ vựng `Chưa học` (chỉ lưu danh sách) và `Đã học` (đưa vào lịch ôn tập SRS).
- **Hành động nhanh `○ Chưa học` / `✓ Đã học` trên mỗi dòng**: Cho phép đánh dấu một từ là đã học ngay trên danh sách với hiệu ứng Toast dynamically.
- **Phân nhóm thông tin rõ ràng**: Chia form từ vựng thành 4 mục dễ đọc (📌 Thông tin chính, 🎯 Trạng thái học, 💬 Câu ví dụ, 📝 Ghi chú).
- **Chuẩn hóa đếm Cần ôn & Báo cáo**: Loại bỏ việc đếm nhầm các từ mới thêm (`not_learned`) vào danh sách cần ôn hôm nay.
- **Bảo toàn lịch sử SRS**: Việc chỉnh sửa Hán tự, Pinyin, Nghĩa hay Bài học tuyệt đối không làm mất số lần đếm đúng/sai hay khoảng cách ôn tập.

#### 3. 🎯 Nút Floating Action Button Kéo Thả Kiểu AssistiveTouch (Draggable FAB)
- **Hỗ trợ Kéo thả (Drag & Drop)**: Nút màu vàng `+` hỗ trợ kéo thả tự do bằng chuột & cảm ứng trên màn hình.
- **Hít lề mượt mà (iPhone-style Edge Snapping)**: Tự động hít về lề trái/phải gần nhất khi thả tay.
- **Ghi nhớ vị trí (`localStorage`)**: Lưu trữ vị trí yêu thích của người dùng qua các phiên làm việc.
- **Menu nổ vị trí thông minh**: Menu thêm nhanh tự động hiển thị bên cạnh nút vàng ở bất kỳ vị trí nào trên màn hình.

---

## 🚀 [v3.0.0] - 2026-07-30

### 🌟 Cải tiến lớn & Nâng cấp UX/UI (Major UX/UI & Logic Overhaul)

#### 1. 💰 Quản lý Tài chính, Giao dịch Thu nhập & Chi tiêu hoàn chỉnh
- **Chuẩn hóa Thu nhập & Chi tiêu**: Form nhập liệu hỗ trợ 2 loại giao dịch độc lập, số tiền dương, tính tổng thu nhập, tổng chi tiêu và số dư tức thì.
- **Biểu đồ cột ngang nhóm theo danh mục ("Thu chi theo danh mục")**: Hiển thị song song cột Chi tiêu (coral `#FF7A5C`) và Thu nhập (mint `#3BB88E`) trên cùng bộ lọc khoảng thời gian chọn (Hôm nay, Tuần này, Tháng này, Năm nay).
- **Thẻ chọn Radio độc lập (Radio-Group Pattern)**: Nâng cấp 2 thẻ chọn loại giao dịch riêng biệt với badge check `✓`, hiệu ứng màu sắc nổi bật, hỗ trợ phím mũi tên bàn phím & ARIA accessibility.
- **Form Inline & Chế độ tập trung (Focused Entry Mode)**: Form hiển thị inline ngay dưới thanh bộ lọc, tự động ẩn toàn bộ danh sách lịch sử giao dịch khi đang nhập liệu và cuộn mượt single-scroll thông minh.

#### 2. 🌙 Chế độ tối (Dark Mode) & Lưu hồ sơ độc lập
- **Chống flash trắng (Anti-flash Pre-hydration)**: Inline script trong `<head>` áp dụng theme tức thì trước khi render trang.
- **Đồng bộ Theme 3 cấp**: Kết hợp mượt mà `documentElement`, `localStorage` và Supabase `user_profiles`.
- **Tách biệt Profile & Theme Persistence**: Thao tác lưu thông tin cá nhân (`display_name`, `height_cm`) hoàn toàn độc lập với việc chọn giao diện.

---

## 🚀 [v2.0.0] - 2026-07-28

### 🌟 Tính năng mới & Cải tiến lớn (Major Features)

#### 1. 🈶 Tổng quát hóa hệ thống HSK & Quản lý Đa khóa học (Multi-Course & Multi-Level)
- **Hỗ trợ đa cấp độ**: Không còn cố định ở HSK 3. Hỗ trợ tất cả cấp độ HSK 1, HSK 2, HSK 3, HSK 4, HSK 5, HSK 6, HSK 7–9 và Khóa học tùy chỉnh.
- **Chuyển đổi khóa học (Course Switcher)**: Cho phép tạo nhiều khóa học và chuyển đổi khóa học đang hoạt động ngay trên thanh tiêu đề bài học.
- **Quản lý khóa học trong Cài đặt**: Bổ sung giao diện tạo mới, đổi tên, thay đổi cấp độ, chọn khóa học chính và xóa khóa học.
- **Tính toán tiến độ động**: Loại bỏ các hằng số cố định (`HSK3_TOTAL = 300`), tiến độ học tập được tính theo mục tiêu thực tế của từng khóa học.

#### 2. 🏆 Gamification, Tích lũy XP & Danh hiệu (Achievements & Gamification)
- **Hệ thống XP Server-side**: Tự động tính điểm XP từ các hoạt động học tập, luyện tập và chi tiêu.
- **RPC Mở khóa Thành tích**: Tự động đánh giá và mở khóa danh hiệu ngay khi người dùng đạt các cột mốc.
- **Trang Thành tích động (`/achievements`)**: Hiển thị chi tiết cấp độ, tiến trình XP lên cấp, danh sách danh hiệu phân loại theo danh mục và thời gian mở khóa.
- **Khởi tạo dữ liệu mẫu tự động**: Tạo dữ liệu mẫu phù hợp khi hoàn thành Onboarding, cùng tính năng "Tạo lại dữ liệu mẫu" và "Xóa dữ liệu mẫu" trong Cài đặt.

#### 3. 🔁 Giao dịch tài chính định kỳ (Recurring Transactions)
- **Giao diện quản lý (`/expenses/recurring`)**: Quản lý đầy đủ các khoản chi tiêu/thu nhập lặp lại (Hằng ngày, Hằng tuần, Hằng tháng, Hằng năm).
- **Engine đồng bộ tự động**: Tự động ghi nhận giao dịch khi đến hạn với cơ chế chống ghi trùng lặp (Idempotency).
- **Hành động nhanh**: Cho phép Tạm dừng, Tiếp tục, Chạy ngay thủ công hoặc Chỉnh sửa tần suất.

#### 4. 📥 Import HSK từ CSV & URL (SSRF Protection)
- **Giao diện Import (`/chinese/import`)**: Hỗ trợ kéo thả file CSV, dán văn bản trực tiếp và cấu hình ánh xạ cột, xử lý bản ghi trùng lặp (Bỏ qua, Cập nhật, Thêm mới).
- **Nhập dữ liệu từ URL**: Tích hợp API handler `/api/import/url` với cơ chế **SSRF Protection** nghiêm ngặt (kiểm tra DNS, chặn IP nội bộ, loopback, link-local, timeout 10s và giới hạn dung lượng 5MB).

#### 5. 📅 Lịch tổng hợp (Aggregated Calendar)
- **Giao diện Lịch tháng (`/calendar`)**: Tổng hợp trực quan tất cả hoạt động trong tháng: Nhật ký cân nặng, Buổi luyện tập, Giờ học tiếng Trung, Ôn tập từ vựng, Giao dịch tài chính, Hạn giao dịch định kỳ và Checklist hàng ngày.
- **Bộ lọc danh mục**: Lọc nhanh sự kiện theo Sức khỏe, Học tập, Tài chính và Tổng hợp.

#### 6. 🔍 Thanh tìm kiếm toàn cục (Global Command Palette)
- **Kích hoạt nhanh `Ctrl + K` / `Cmd + K`**: Tìm kiếm tức thì từ vựng, ngữ pháp, bài học, khóa học, giao dịch chi tiêu, bài tập thể thao và nhật ký cân nặng.
- Phân nhóm kết quả rõ ràng kèm phím tắt điều hướng bàn phím.

#### 7. 🌙 Dark Mode & PWA Ngoại tuyến (PWA & Offline Support)
- **Chế độ tối (Dark mode)**: Chuyển đổi mượt mà giữa Sáng / Tối, lưu trữ đồng bộ vào `user_profiles` và `localStorage`, không gây giật trang.
- **PWA Manifest & Service Worker**: Đăng ký `manifest.json` và `sw.js` hỗ trợ cài đặt ứng dụng trên thiết bị di động / desktop.
- **Trang Ngoại tuyến (`/offline`)**: Tự động hiển thị trang thông báo ngoại tuyến Kawaii khi mất kết nối mạng (loại trừ các kết nối Supabase API).

#### 8. 🇻🇳 Chuẩn hóa 100% Giao diện Tiếng Việt
- Toàn bộ nhãn bấm, tiêu đề, placeholder, tooltip, toast notification, empty state và dialog xác nhận đều sử dụng tiếng Việt tự nhiên và nhất quán.

---

## 📌 [v1.0.0] - Khởi tạo dự án
- Module Giảm cân & Luyện tập cơ bản.
- Module Học tiếng Trung HSK 3 cơ bản.
- Module Chi tiêu cá nhân & Ngân sách tháng.
- Dashboard tổng hợp & Báo cáo thống kê.
