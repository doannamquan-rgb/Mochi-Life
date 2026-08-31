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

## 4. Quy Tắc Phiên Bản: App Version vs Runtime Version

| Trường | Ví dụ | Ý nghĩa | Khi nào thay đổi? |
| :--- | :--- | :--- | :--- |
| `version` (app.json) | `6.3.0` | Marketing / User-facing Version | Thay đổi theo từng đợt release tính năng lớn/nhỏ |
| `runtimeVersion` (app.json) | `6.1.0` | Khóa tương thích Native Binary | **CHỈ ĐỔI KHI BUILD APK MỚI** (thay đổi native code/SDK) |

> [!IMPORTANT]
> **Tại sao `runtimeVersion` giữ ở `6.1.0` khi `version` là `6.3.0`?**
> Binary APK Android đã cài trên máy người dùng được build với `runtimeVersion = 6.1.0`. Khi phát hành bản vá JavaScript qua OTA (`eas update --channel production`), EAS sẽ gán tag `runtimeVersion = 6.1.0` cho bundle. Thiết bị có runtime `6.1.0` sẽ nhận và áp dụng bản cập nhật ngay lập tức mà không yêu cầu người dùng cài lại APK.

---

## 5. Quy Tắc Quyết Định: Khi Nào Cần Build APK Mới?

### ✅ BẮT BUỘC build Native APK/AAB mới khi:
1. Nâng cấp phiên bản Expo SDK (ví dụ SDK 57 -> SDK 58).
2. Thêm, xóa hoặc cập nhật thư viện có mã nguồn Native (Java / Kotlin / C++ / Objective-C).
3. Thay đổi cấu hình quyền hạn (permissions), package identifier, hoặc icon trong `app.json`.
4. Thay đổi cấu hình `runtimeVersion` policy trong `app.json`.

### ⚡ Chỉ cần phát hành OTA khi:
1. Sửa lỗi logic TypeScript / JavaScript.
2. Thêm hoặc cập nhật màn hình, components, styles, themes.
3. Thay đổi câu lệnh API, query keys, logic tính toán trong `@mochi/shared`.
4. Thêm hoặc sửa assets tĩnh (hình ảnh, icon SVG) có trong project.

---

## 6. Bảng Lệnh EAS Thường Dùng

```bash
# 1. Kiểm tra danh sách channel
npx eas channel:list

# 2. Kiểm tra các bản update đã publish trên channel
npx eas update:list --channel production

# 3. Publish bản OTA mới lên Production
npx eas update --channel production --message "Release v6.3.0.x - OTA bugfix"

# 4. Publish bản OTA mới lên Preview (Test)
npx eas update --channel preview --message "Preview test OTA"

# 5. Rollback về bản OTA ổn định trước đó
npx eas update:republish --channel production --group <UPDATE_GROUP_ID_STABLE>

# 6. Build APK Preview mới
npx eas build -p android --profile preview

# 7. Build AAB Production mới (Google Play)
npx eas build -p android --profile production
```
