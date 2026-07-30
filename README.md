# 🐱 Mochi Life

> Ứng dụng quản lý cuộc sống cá nhân đa năng theo phong cách kawaii — Giảm cân & Luyện tập, Học tiếng Trung đa cấp độ, Kiểm soát Chi tiêu, Giao dịch định kỳ, Lịch tổng hợp, Gamification & PWA Offline.

link web: [[https://github.com/doannamquan-rgb/Mochi-Life](https://github.com/doannamquan-rgb/Mochi-Life)](https://mochi-life-z7pj-delta.vercel.app/)

---

## ✨ Tính năng chính

### 💪 Module Sức khỏe (Fitness & Weight)
- Theo dõi cân nặng hàng ngày và tính chỉ số BMI tự động
- Nhật ký luyện tập (chạy bộ, gym, yoga, cầu lông,...) ước tính lượng calo tiêu thụ
- Đặt mục tiêu cân nặng & mục tiêu vận động hàng tuần

### 🈶 Module Học tiếng Trung (Multi-Course & Multi-Level)
- Hỗ trợ **nhiều khóa học** và **nhiều cấp độ**: HSK 1, HSK 2, HSK 3, HSK 4, HSK 5, HSK 6, HSK 7–9 và Khóa học tùy chỉnh
- Chuyển đổi linh hoạt giữa các khóa học (Course Switcher)
- Thuật toán ôn tập lặp lại ngắt quãng SM-2 (Spaced Repetition Flashcard) & Quiz trắc nghiệm
- Quản lý bài học, từ vựng, ngữ pháp và nhật ký học tập
- Nhập từ vựng HSK từ file **CSV** hoặc **đường dẫn URL công khai** với cơ chế bảo mật **SSRF Protection**

### 💰 Module Tài chính (Expenses & Recurring Transactions)
- Ghi nhận giao dịch Thu nhập / Chi tiêu theo Danh mục và Ví
- **Giao dịch định kỳ (Recurring Transactions)**: Tự động hóa chi tiêu hằng ngày, hằng tuần, hằng tháng, hằng năm với cơ chế chống trùng lặp (Idempotency)
- Quản lý ngân sách tháng và cảnh báo hạn mức
- Báo cáo chi tiêu theo biểu đồ tròn & biểu đồ cột

### 📅 Lịch tổng hợp (Aggregated Calendar)
- Lịch xem theo tháng tổng hợp tất cả sự kiện: Cân nặng, Luyện tập, Bài học tiếng Trung, Ôn tập từ vựng, Giao dịch tài chính, Hạn giao dịch định kỳ, Daily Checklist

### 🏆 Gamification & Thành tích (Achievements & XP)
- Hệ thống tích lũy XP server-side và tính cấp độ tự động
- Mở khóa các danh hiệu thành tích theo từng cột mốc (Sức khỏe, Học tập, Tài chính, Tổng hợp)
- Thông báo mở khóa danh hiệu ngay lập tức khi đạt yêu cầu

### 🌙 Dark Mode & PWA Offline Support
- Chuyển đổi giao diện Sáng / Tối (Light / Dark mode) đồng bộ và không bị giật trang (flash)
- Cài đặt PWA trên máy tính & điện thoại di động
- Hỗ trợ truy cập ứng dụng khi **Ngoại tuyến (Offline)** thông qua Service Worker

---

## 🛠️ Stack công nghệ

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS v4 + Kawaii Design System (CSS Variables)
- **Database & Backend**: Supabase PostgreSQL + Row Level Security (RLS) + RPC
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
Trong **Supabase Dashboard → SQL Editor**, chạy lần lượt nội dung của 5 file migration theo thứ tự sau:

1. `supabase/migrations/001_create_tables.sql` — Tạo toàn bộ cấu trúc bảng ban đầu
2. `supabase/migrations/002_rls_policies.sql` — Thiết lập bảo mật Row Level Security (RLS)
3. `supabase/migrations/003_seed_achievements.sql` — Khởi tạo danh sách danh hiệu ban đầu
4. `supabase/migrations/004_generalize_hsk_and_courses.sql` — Tổng quát hóa hệ thống HSK & giao dịch định kỳ
5. `supabase/migrations/005_xp_gamification_and_achievements.sql` — Bổ sung RPC kiểm tra thành tích & nhật ký XP

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

---

## 📥 Định dạng CSV Nhập HSK

Dòng đầu tiên là tiêu đề cột. Mochi Life hỗ trợ nhận diện các cột sau:

```csv
hanzi,pinyin,meaning,word_type,example_cn,example_vi,level
学习,xuéxí,học tập,động từ,我每天学习中文。,Tôi học tiếng Trung mỗi ngày.,HSK3
```

Khi nhập từ URL, ứng dụng được tích hợp **SSRF Protection** chặn các địa chỉ IP nội bộ, loopback, private IPv4/IPv6 và link-local nhằm bảo mật hệ thống.

---

## 🛡️ Kiểm tra & Build Production

Để kiểm tra build production và PWA offline support:

```bash
npm run build
npm run start
```

---

## 🔒 Khắc phục sự cố (Troubleshooting)

- **Lỗi RLS / Không thấy dữ liệu**: Kiểm tra xem user đã đăng nhập chưa và đã chạy file `002_rls_policies.sql` chưa.
- **Không hiện dữ liệu mẫu**: Đảm bảo hoàn thành các bước Onboarding lần đầu tiên hoặc nhấn "Tạo lại dữ liệu mẫu" trong Cài đặt.
- **Lỗi Import URL**: Kiểm tra xem URL có truy cập công khai được không và không phải là IP nội bộ (`localhost`, `127.0.0.1`, `10.x.x.x`).
