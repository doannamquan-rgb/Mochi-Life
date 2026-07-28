# 📜 Nhật ký cập nhật (Release Notes & Changelog)

Tất cả các thay đổi và tính năng mới của dự án **Mochi Life** sẽ được ghi nhận chi tiết tại đây.

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
