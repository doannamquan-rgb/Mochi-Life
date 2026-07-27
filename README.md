# 🐱 Mochi Life

> Ứng dụng quản lý mục tiêu cá nhân theo phong cách kawaii — Giảm cân, Học tiếng Trung HSK 3, và Kiểm soát Chi tiêu.

## ✨ Tính năng

### 💪 Module Giảm cân & Luyện tập
- Theo dõi cân nặng hàng ngày với biểu đồ
- Ghi nhật ký luyện tập (ước tính calo, cự ly, bước chân)
- Đặt mục tiêu cân nặng & xem chỉ số BMI
- Biểu đồ tiến độ theo ngày/tuần/tháng

### 🈶 Module Học tiếng Trung HSK 3
- Quản lý bài học theo khóa học
- Từ điển từ vựng với Hán tự, Pinyin, nghĩa
- **Hệ thống SRS (Spaced Repetition)** — flashcard thông minh theo thuật toán SM-2
- Quiz trắc nghiệm 4 lựa chọn
- Học ngữ pháp với ví dụ minh họa
- Nhật ký buổi học + streak

### 💰 Module Chi tiêu cá nhân
- Ghi thu/chi với danh mục và ví
- Quản lý ngân sách theo tháng (tổng + theo danh mục)
- Cảnh báo khi vượt ngân sách
- Báo cáo chi tiêu bằng biểu đồ pie & bar chart

### 📊 Dashboard & Báo cáo
- Dashboard tổng hợp 3 module
- Báo cáo chi tiết với 5 khung thời gian (7N, 30N, 3T, 6T, 1N)
- Xuất dữ liệu CSV & backup JSON
- Hệ thống thành tích (Achievements)

## 🛠️ Stack công nghệ

- **Frontend**: Next.js 16 (App Router) + TypeScript
- **Styling**: Tailwind CSS v4 + Custom Kawaii Design System
- **Database & Auth**: Supabase (PostgreSQL + RLS)
- **Charts**: Recharts
- **SRS Algorithm**: SM-2 based Spaced Repetition
- **Fonts**: Nunito (Google Fonts)

## 🚀 Cài đặt và Chạy

### 1. Yêu cầu hệ thống
- Node.js 20+
- Tài khoản [Supabase](https://supabase.com) (miễn phí)

### 2. Clone và cài đặt
```bash
git clone <your-repo>
cd hsk
npm install
```

### 3. Tạo Supabase Project
1. Truy cập [supabase.com](https://supabase.com) → New Project
2. Chọn region gần nhất (Singapore)
3. Lưu lại **Project URL** và **anon public key**

### 4. Cấu hình môi trường
Tạo file `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. Tạo database schema
Trong Supabase Dashboard → SQL Editor, chạy tuần tự:
1. `supabase/migrations/0001_initial_schema.sql` — tạo 23 bảng + RLS
2. `supabase/seed.sql` — dữ liệu mẫu HSK 3

### 6. Bật Authentication
Supabase Dashboard → Authentication → Providers:
- **Email**: Enabled ✅
- Tắt "Confirm email" để dễ test

### 7. Chạy ứng dụng
```bash
npm run dev
```
Mở [http://localhost:3000](http://localhost:3000) 🎉

## 📁 Cấu trúc thư mục

```
app/
├── (app)/                    # Authenticated routes
│   ├── layout.tsx            # App shell (sidebar + bottom nav + FAB)
│   ├── dashboard/            # Dashboard tổng hợp
│   ├── fitness/              # Module giảm cân
│   │   ├── page.tsx          # Overview + charts
│   │   ├── weight/           # Nhật ký cân nặng
│   │   ├── exercise/         # Nhật ký luyện tập
│   │   └── goals/            # Mục tiêu sức khoẻ
│   ├── chinese/              # Module tiếng Trung
│   │   ├── page.tsx          # Overview
│   │   ├── lessons/          # Bài học
│   │   ├── vocabulary/       # Từ vựng + CRUD
│   │   │   ├── flashcard/    # Flashcard SRS
│   │   │   └── quiz/         # Quiz trắc nghiệm
│   │   ├── grammar/          # Ngữ pháp HSK
│   │   ├── journal/          # Nhật ký học tập
│   │   └── review/           # Phiên ôn tập SRS
│   ├── expenses/             # Module chi tiêu
│   │   ├── page.tsx          # Giao dịch + form
│   │   ├── budget/           # Ngân sách tháng
│   │   └── categories/       # Quản lý danh mục
│   ├── reports/              # Báo cáo tổng hợp
│   ├── achievements/         # Thành tích gamification
│   └── settings/             # Cài đặt tài khoản + data
├── login/                    # Đăng nhập
├── register/                 # Đăng ký
├── forgot-password/          # Quên mật khẩu
└── onboarding/               # Thiết lập ban đầu

lib/
├── types.ts                  # TypeScript types (23 tables)
├── format.ts                 # Formatting + constants
├── date-utils.ts             # Date helpers (vi locale)
├── spaced-repetition.ts      # SRS SM-2 algorithm
└── supabase/
    ├── client.ts             # Client-side Supabase
    └── server.ts             # Server-side Supabase

proxy.ts                      # Auth proxy (Next.js 16)
```

## 🎨 Design System Kawaii

| Tên | Hex | Dùng cho |
|---|---|---|
| Cream | `#FFF8F0` | Background |
| Cheese | `#FFCA1A` | Primary action, CTA |
| Peach | `#FF7A5C` | Fitness, warning |
| Mint | `#3BB88E` | Income, success |
| Lavender | `#8F71F5` | Study, info |
| Chocolate | `#3D2B1F` | Text chính |

## 📝 Notes kỹ thuật

- Dữ liệu bảo mật qua **Row Level Security (RLS)** — mỗi user chỉ thấy data của mình
- SRS dùng thuật toán **SM-2** (SuperMemo): interval tự động tăng theo kết quả ôn tập
- `proxy.ts` = Next.js 16 version của `middleware.ts` (đã migrate)
- CSS: Tailwind v4 + `@theme` tokens + `style jsx` cho scoped component styles
- Tất cả giao diện **tiếng Việt** hoàn toàn

---
Made with 🐱 and love
