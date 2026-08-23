# 🐱 Mochi Life

> Ứng dụng quản lý cuộc sống cá nhân đa năng theo phong cách kawaii — Giảm cân & Luyện tập, Học tiếng Trung đa cấp độ, Kiểm soát Chi tiêu, Giao dịch định kỳ, Lịch tổng hợp, Gamification & PWA Offline.



---

## ✨ Tính năng chính

### 💪 Module Sức khỏe (Fitness & Weight)
- Theo dõi cân nặng hàng ngày và tính chỉ số BMI tự động
- Nhật ký luyện tập (chạy bộ, gym, yoga, cầu lông,...) ước tính lượng calo tiêu thụ
- Đặt mục tiêu cân nặng & mục tiêu vận động hàng tuần
- Tích lũy XP khi ghi nhận cân nặng và hoàn thành bài tập

### 🈶 Module Học tiếng Trung (Multi-Course & Multi-Level)
- Hỗ trợ **nhiều khóa học** và **nhiều cấp độ**: HSK 1, HSK 2, HSK 3, HSK 4, HSK 5, HSK 6, HSK 7–9 và Khóa học tùy chỉnh
- Chuyển đổi linh hoạt giữa các khóa học (Course Switcher)
- Thuật toán ôn tập lặp lại ngắt quãng SM-2 (Spaced Repetition Flashcard) & Quiz trắc nghiệm
- Quản lý bài học, từ vựng, ngữ pháp và nhật ký học tập với tính toán chuỗi ngày học liên tục (Streak) chuẩn xác theo múi giờ
- Nhập từ vựng HSK từ file **CSV** hoặc **đường dẫn URL công khai** với cơ chế bảo mật **SSRF Protection** đa tầng (manual redirect loop, streaming payload limit 5MB)

### 💰 Module Tài chính (Expenses & Recurring Transactions)
- Ghi nhận giao dịch Thu nhập / Chi tiêu theo Danh mục và Ví
- **Giao dịch định kỳ (Recurring Transactions)**: Tự động hóa chi tiêu hằng ngày, hằng tuần, hằng tháng, hằng năm với cơ chế bảo lưu ngày neo (`anchor_day`, `anchor_month`) chống trượt ngày cuối tháng (Jan 31 → Feb 28 → Mar 31) và chống trùng lặp (Idempotency)
- Quản lý ngân sách tháng và cảnh báo hạn mức
- Báo cáo chi tiêu theo biểu đồ tròn & biểu đồ cột

### 📅 Lịch tổng hợp (Aggregated Calendar)
- Lịch xem theo tháng tổng hợp tất cả sự kiện: Cân nặng, Luyện tập, Bài học tiếng Trung, Ôn tập từ vựng, Giao dịch tài chính, Hạn giao dịch định kỳ, Daily Checklist
- Tự động đồng bộ thời gian thực qua hệ thống Custom Events khi có thay đổi dữ liệu

### 🏆 Gamification & Thành tích (Achievements & XP)
- Hệ thống tích lũy XP server-side có ràng buộc toàn vẹn cơ sở dữ liệu (`CHECK (amount > 0 AND amount <= 100)` + unique idempotency constraint)
- Tự động mở khóa danh hiệu thành tích an toàn với guard kiểm tra quyền (`auth.uid()`)
- Thông báo mở khóa danh hiệu ngay lập tức khi đạt yêu cầu

### 💾 Sao lưu & Khôi phục Dữ liệu Toàn diện (Backup & Transactional Restore)
- **Sao lưu (Export)**: Xuất toàn bộ 23 bảng dữ liệu người dùng ra định dạng file JSON phiên bản chuẩn, hỗ trợ phân trang tự động vượt giới hạn 1.000 dòng.
- **Khôi phục (Restore)**: Thực thi transactional khôi phục phía server qua PostgreSQL RPC function `restore_user_data`, tự động ghi đè `user_id` an toàn, ánh xạ thành tích theo mã `code`, và rollback toàn bộ nếu có bất kỳ lỗi nào xảy ra.
- *Lưu ý: File sao lưu cơ sở dữ liệu JSON không bao gồm các file ảnh nhị phân đã tải lên storage (avatar, ảnh cân nặng, hóa đơn).*

### 🌙 Dark Mode & PWA Offline Support
- Chuyển đổi giao diện Sáng / Tối (Light / Dark mode) đồng bộ và không bị giật trang (flash)
- Cài đặt PWA trên máy tính & điện thoại di động
- Hỗ trợ truy cập ứng dụng khi **Ngoại tuyến (Offline)** thông qua Service Worker

---

## 🛠️ Stack công nghệ

- **Framework**: Next.js 16.2 (App Router, Turbopack) + React 19 + TypeScript
- **Styling**: Tailwind CSS v4 + Kawaii Design System (CSS Variables)
- **Database & Backend**: Supabase PostgreSQL + Row Level Security (RLS) + Stored Procedures / RPC
- **AI SDK**: `@google/genai` (Gemini Flash 3.7) với native `abortSignal` & `httpOptions.timeout`
- **Linting & Code Quality**: ESLint (Flat Config `eslint.config.mjs`) + Next.js Core Web Vitals
- **Unit Testing**: Vitest
- **Command Palette**: `cmdk` (`Ctrl + K` / `Cmd + K`)
- **Charts**: Recharts
- **PWA**: Web App Manifest & Custom Service Worker

---

## 🚀 Hướng dẫn Setup Supabase & Chạy ứng dụng

### 1. Yêu cầu hệ thống
- Node.js version 20+
- Quản lý gói `npm`
- Tài khoản [Supabase](https://supabase.com)

### 2. Clone repository & Cài đặt thư viện
```bash
git clone https://github.com/doannamquan-rgb/Mochi-Life.git
cd Mochi-Life
npm install
```

### 3. Cấu hình file môi trường `.env.local`
Tạo file `.env.local` tại thư mục gốc của dự án:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Lấy `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY` trong **Supabase Dashboard → Project Settings → API**.

### 4. Chạy các file Database Migration
Trong **Supabase Dashboard → SQL Editor**, chạy lần lượt nội dung của 11 file migration theo thứ tự sau:

1. `supabase/migrations/001_create_tables.sql` — Cấu trúc bảng ban đầu
2. `supabase/migrations/002_rls_policies.sql` — Thiết lập bảo mật Row Level Security (RLS)
3. `supabase/migrations/003_seed_achievements.sql` — Khởi tạo danh sách danh hiệu ban đầu
4. `supabase/migrations/004_generalize_hsk_and_courses.sql` — Tổng quát hóa hệ thống HSK & giao dịch định kỳ
5. `supabase/migrations/005_xp_gamification_and_achievements.sql` — Bổ sung RPC kiểm tra thành tích & nhật ký XP
6. `supabase/migrations/006_audit_and_fix_transactions.sql` — Sửa toàn vẹn dữ liệu giao dịch
7. `supabase/migrations/007_data_sync_and_course_integrity.sql` — Đồng bộ dữ liệu & toàn vẹn khóa học
8. `supabase/migrations/008_security_hardening_rpc.sql` — Bảo mật hàm RPC `check_and_unlock_achievements` với `auth.uid()` guard
9. `supabase/migrations/009_xp_idempotency_and_integrity.sql` — Ràng buộc chống trùng lặp XP & giới hạn mức điểm
10. `supabase/migrations/010_recurring_anchor.sql` — Bổ sung trường ngày neo (`anchor_day`, `anchor_month`) cho giao dịch định kỳ
11. `supabase/migrations/011_transactional_restore_rpc.sql` — Hàm RPC khôi phục toàn bộ dữ liệu an toàn theo transaction

### 5. Cấu hình Supabase Authentication
1. Truy cập **Supabase Dashboard → Authentication → Providers**.
2. Chọn **Email** → Enabled ✅.
3. Tắt "Confirm email" (nếu muốn đăng nhập ngay không cần xác nhận email trong môi trường dev).
4. Thiết lập **Site URL** và **Redirect URLs** phù hợp với domain local (`http://localhost:3000`) hoặc trang deployment.

### 6. Khởi chạy ứng dụng
```bash
npm run dev
```
Mở trình duyệt tại: `http://localhost:3000`

### 7. Mochi AI Setup (Optional)
Ứng dụng có thể hoạt động hoàn toàn độc lập không cần AI. Nếu muốn bật tính năng trợ lý ảo:
1. Thêm các biến sau vào `.env.local`:
```env
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-3.7-flash
MOCHI_AI_ENABLED=true
```
2. Lấy API key từ Google AI Studio.
3. Lưu ý bảo mật: API key chỉ được cấu hình phía Server. Mochi AI là trợ lý Read-only và chỉ đọc dữ liệu tổng hợp để hỗ trợ bạn (không lưu trữ ngoài ý muốn).

---

## 🧪 Kiểm tra Chất lượng Code & Kiểm thử (QA Commands)

Hệ thống được trang bị bộ lệnh kiểm tra toàn diện:

```bash
# 1. Chạy toàn bộ Unit Tests (11 test suites / 78 tests)
npm test

# 2. Kiểm tra TypeScript & Next.js Type Generation
npm run typecheck

# 3. Quét tĩnh mã nguồn với ESLint Flat Config
npm run lint

# 4. Kiểm tra Build Production Bundle & 37 Routes
npm run build
```

---

## 📥 Định dạng CSV Nhập HSK

Dòng đầu tiên là tiêu đề cột. Mochi Life hỗ trợ nhận diện các cột sau:

```csv
hanzi,pinyin,meaning,word_type,example_cn,example_vi,level
学习,xuéxí,học tập,động từ,我每天学习中文。,Tôi học tiếng Trung mỗi ngày.,HSK3
```

Khi nhập từ URL, ứng dụng được tích hợp **SSRF Protection** đa tầng chặn các địa chỉ IP nội bộ, loopback, private IPv4/IPv6, link-local, credentials nhúng trong URL và giới hạn dung lượng tải về tối đa 5MB.

---

## 🔒 Khắc phục sự cố (Troubleshooting)

- **Lỗi RLS / Không thấy dữ liệu**: Kiểm tra xem user đã đăng nhập chưa và đã chạy đầy đủ các file migration từ 001 đến 011 chưa.
- **Không hiện dữ liệu mẫu**: Đảm bảo hoàn thành các bước Onboarding lần đầu tiên hoặc nhấn "Tạo lại dữ liệu mẫu" trong Cài đặt.
- **Lỗi Import URL**: Kiểm tra xem URL có truy cập công khai được không và không phải là IP nội bộ (`localhost`, `127.0.0.1`, `10.x.x.x`).
- **Khôi phục dữ liệu**: Để khôi phục dữ liệu từ file backup, vào tab **Cài đặt → Dữ liệu**, chọn file JSON và nhập đúng chữ "KHOI PHUC" khi có thông báo xác nhận.
