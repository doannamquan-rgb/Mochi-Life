# Mochi Life Mobile (Expo React Native Client)

> **Mochi Life Mobile** là ứng dụng di động chính thức của hệ sinh thái Mochi Life, hoạt động song song với Web Client (`/`) trên cùng một Supabase backend, RLS, domain logic (`@mochi/shared`), và Next.js AI API.

---

## 1. Yêu Cầu & Cấu Hình Môi Trường

### Biến môi trường (`mobile/.env.local`)
```env
EXPO_PUBLIC_SUPABASE_URL=https://xrsnmosplvkslttomdfb.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_muUlsojdC1SFetRJZHwbmA_6eZPdwmS
EXPO_PUBLIC_MOCHI_API_URL=https://mochi-life-z7pj-delta.vercel.app
```

> **BẢO MẬT**: Tuyệt đối **KHÔNG** đặt `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, hay database credentials vào mã nguồn mobile hoặc các biến `EXPO_PUBLIC_*`.

---

## 2. Lệnh Chạy Phát Triển (Development)

### Cài đặt dependencies (tại thư mục gốc monorepo):
```bash
npm install
```

### Chạy Metro Bundler & Khởi động Expo:
```bash
cd mobile
npm start
```

### Chạy trên thiết bị thật:
- Cài đặt **Expo Go** (hoặc Custom Development Build) từ Google Play / App Store.
- Quét mã QR hiển thị trên terminal hoặc giao diện Metro.
- Đảm bảo điện thoại và máy tính cùng kết nối chung một mạng Wi-Fi hoặc dùng `npx expo start --tunnel`.

### Kiểm tra TypeScript & Hệ thống:
```bash
npm run typecheck
npm run doctor
```

---

## 3. Quy Trình Build Native APK & Phát Hành OTA

### A. Lệnh Build Preview APK (Cài trực tiếp trên Android):
```bash
cd mobile
npx eas build -p android --profile preview
```
hoặc:
```bash
npm run build:preview
```

### B. Lệnh Phát Hành Cập Nhật OTA Preview (Kiểm thử nhanh không cần cài lại APK):
```bash
cd mobile
npx eas update --channel preview --message "Mô tả bản cập nhật"
```
hoặc:
```bash
npm run update:preview
```

### C. Lệnh Build Production AAB (Google Play Release):
```bash
cd mobile
npx eas build -p android --profile production
```
hoặc:
```bash
npm run build:production
```

### D. Lệnh Phát Hành Cập Nhật OTA Production:
```bash
cd mobile
npx eas update --channel production --message "Mô tả bản cập nhật production"
```
*(Chỉ thực hiện khi đã kiểm thử kỹ lưỡng trên preview)*

---

## 4. Khi Nào Cần Build APK Mới vs Khi Nào Chỉ Cần OTA?

| Tình huống thay đổi | Cần Build Native APK Mới? | Có Thể Cập Nhật Qua OTA? | Ghi chú |
| :--- | :---: | :---: | :--- |
| Thay đổi UI, màu sắc, phông chữ, bố cục | ❌ KHÔNG | ✅ **CÓ** | Nhận tức thì sau khi reload app |
| Sửa bug logic, TypeScript, hook, React Query | ❌ KHÔNG | ✅ **CÓ** | Tự động đồng bộ qua EAS Update |
| Thêm hình ảnh, icon SVG, assets tĩnh | ❌ KHÔNG | ✅ **CÓ** | Assets được đóng gói cùng bundle |
| Thêm thư viện thuần JS/TS (e.g. date-fns, zod) | ❌ KHÔNG | ✅ **CÓ** | Hoàn toàn tương thích runtime |
| Thêm thư viện Native mới (chứa mã Java/Kotlin/ObjC) | ✅ **BẮT BUỘC** | ❌ Không | Cần compile native binary mới |
| Nâng cấp Expo SDK (e.g. SDK 57 -> SDK 58) | ✅ **BẮT BUỘC** | ❌ Không | Thay đổi runtime engine |
| Sửa cấu hình `android` / `ios` trong `app.json` (permissions, package name) | ✅ **BẮT BUỘC** | ❌ Không | Ảnh hưởng Manifest / Gradle |

---

## 5. Kiến Trúc Cốt Lõi

- **Architecture Document**: Chi tiết tại [`docs/mobile-architecture.md`](../docs/mobile-architecture.md)
- **Release Guide**: Chi tiết tại [`docs/mobile-release.md`](../docs/mobile-release.md)
- **Parity Matrix**: Chi tiết tại [`docs/FEATURE_PARITY.md`](../docs/FEATURE_PARITY.md)
