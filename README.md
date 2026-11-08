# DATING — ứng dụng kết nối và không gian Couple

DATING giúp người dùng tạo hồ sơ, khám phá, Like và Match, trò chuyện, chủ động
mời nhau trở thành Couple, rồi cùng sử dụng không gian riêng gồm câu hỏi, thử
thách, kỷ niệm, nhật ký và kế hoạch hẹn hò. Match không tự động đồng nghĩa với
Couple; hai người phải xác nhận lời mời.

## Kiến trúc mục tiêu

- **Web:** Next.js App Router và React — chỉ đảm nhiệm giao diện, không giữ
  nghiệp vụ backend sau khi chuyển đổi hoàn tất.
- **API:** NestJS — REST API, xác thực JWT và xử lý nghiệp vụ tập trung.
- **Cơ sở dữ liệu:** PostgreSQL, truy cập từ NestJS qua TypeORM và migrations.
- **Realtime:** Socket.IO trên NestJS cho chat và sự kiện ứng dụng.
- **Ảnh:** Cloudinary; thông tin bí mật chỉ lưu ở backend.

## Trạng thái chuyển đổi

Web chuyển toàn bộ API qua NestJS bằng proxy server-side; realtime chat, match,
thông báo và cập nhật Couple dùng Socket.IO. NestJS sở hữu xác thực, hồ sơ,
social, Couple, notifications, PostgreSQL migrations và upload ảnh Cloudinary.

Hệ thống bắt đầu với PostgreSQL mới; dữ liệu cũ không được nhập. Cần cấu hình
PostgreSQL và chạy migrations trước khi khởi động API. Chưa xác minh migrations
trên PostgreSQL production hoặc thực hiện kiểm thử OAuth/SMTP/Cloudinary với
credentials thật.

Xem [hướng dẫn API](./apps/api/README.md) để chạy backend mới và
[bản thiết kế công nghệ](./dating_tech_stack_blueprint.md) để xem kiến trúc cùng
lộ trình chuyển đổi.

## Thư mục chính

```text
apps/
  api/     NestJS API, PostgreSQL migrations, Socket.IO và Cloudinary
  web/     Next.js giao diện; REST API proxy và Socket.IO client
```
