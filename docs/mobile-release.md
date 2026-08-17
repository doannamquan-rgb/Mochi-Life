# Mochi Life Mobile Release & OTA Update Guide

> **Mục tiêu**: Hướng dẫn chi tiết quy trình phát hành bản dựng APK mới và phát hành bản cập nhật OTA (Over-The-Air) an toàn cho Mochi Life Mobile.

---

## 1. Tổng Quan Kênh Phát Hành (Release Channels)

| Channel | Mục đích | Target Profile | Build Output | OTA Command |
| :--- | :--- | :--- | :--- | :--- |
| `development` | Phát triển nội bộ & debug | `development` | Dev Client APK | N/A (Metro Hot Reload) |
| `preview` | Kiểm thử trên thiết bị thật Android | `preview` | Standalone APK | `npx eas update --channel preview` |
| `production` | Phát hành người dùng chính thức | `production` | Google Play AAB | `npx eas update --channel production` |

---

## 2. Quy Trình Phát Hành Bản Dựng Native Mới (APK / AAB)

### Bước 1: Kiểm tra chất lượng trước khi build
```bash
# Tại thư mục gốc monorepo
npm test
npm run typecheck

# Tại thư mục mobile
cd mobile
npm run typecheck
npm run doctor
```

### Bước 2: Build Native Preview APK (Cài trực tiếp để test)
```bash
cd mobile
npx eas build -p android --profile preview
```
- Khi build hoàn tất, EAS CLI sẽ xuất đường dẫn tải file `.apk`.
- Tải file `.apk` về điện thoại Android và cài đặt.

### Bước 3: Build Production AAB (Google Play Store)
```bash
cd mobile
npx eas build -p android --profile production
```

---

## 3. Quy Trình Phát Hành Bản Cập Nhật OTA (EAS Update)

### A. Phát hành OTA lên kênh Preview (Kiểm thử):
```bash
cd mobile
npx eas update --channel preview --message "Mô tả tính năng hoặc bug fix"
```
- Mở app preview trên điện thoại Android đã cài APK.
- Ứng dụng sẽ tự động tải bản bundle mới trong nền.
- Bấm thông báo **"Cập nhật & Khởi động lại"** hoặc khởi động lại app để áp dụng.

### B. Phát hành OTA lên kênh Production:
*(Chỉ thực hiện sau khi đã xác nhận bản preview hoạt động hoàn hảo trên thiết bị thật)*
```bash
cd mobile
npx eas update --channel production --message "Release v6.0.x - Ghi chú cập nhật"
```

---

## 4. Quy Tắc Quyết Định: Khi Nào Cần Build APK Mới?

### ✅ Cần build Native APK/AAB mới khi:
1. Nâng cấp phiên bản Expo SDK (ví dụ SDK 57 -> SDK 58).
2. Thêm hoặc cập nhật thư viện có mã nguồn Native (Java / Kotlin / C++ / Objective-C).
3. Thay đổi cấu hình quyền hạn (permissions), package identifier, hoặc icon trong `app.json`.
4. Thay đổi cấu hình `runtimeVersion` policy trong `app.json`.

### ⚡ Chỉ cần phát hành OTA khi:
1. Sửa lỗi logic TypeScript / JavaScript.
2. Thêm hoặc cập nhật màn hình, components, styles, themes.
3. Thay đổi câu lệnh API, query keys, logic tính toán trong `@mochi/shared`.
4. Thêm hoặc sửa assets tĩnh (hình ảnh, icon SVG) có trong project.

---

## 5. Kế Hoạch Rollback Khi Gặp Sự Cố OTA

Nếu một bản OTA gặp lỗi nghiêm trọng, bạn có thể tái phát hành bản OTA an toàn trước đó ngay lập tức mà không cần tạo build mới:
```bash
# Xem danh sách các bản update gần nhất
npx eas update:list --channel production

# Re-publish bản cập nhật ổn định
npx eas update:republish --channel production --group <UPDATE_GROUP_ID_STABLE>
```
