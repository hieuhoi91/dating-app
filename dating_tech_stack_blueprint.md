# DATING — Kiến trúc và công nghệ mục tiêu

> **Sản phẩm:** DATING (A Little Closer)  
> **Định hướng:** Web-first, API-first; NestJS backend độc lập, PostgreSQL, Socket.IO và Cloudinary.  
> **Trạng thái:** Web REST API và realtime đã chuyển sang NestJS/PostgreSQL/Socket.IO; cần hoàn tất kiểm thử trên PostgreSQL thật và các tích hợp production.

## 1. Mô tả sản phẩm

DATING là ứng dụng kết nối tình cảm với ba hành trình:

1. **Find:** tạo hồ sơ, khám phá, Like và Match.
2. **Connect:** trò chuyện và chủ động gửi/chấp nhận lời mời Couple.
3. **Keep Close:** không gian Couple gồm câu hỏi, thử thách, kỷ niệm, nhật ký và kế hoạch hẹn hò.

Match không tự động tạo Couple. Backend phải xác thực mọi quyền truy cập, thực thi quy tắc Match/Couple và là nguồn dữ liệu có thẩm quyền duy nhất.

## 2. Kiến trúc mục tiêu

```text
┌──────────────────────┐       HTTPS / Socket.IO       ┌─────────────────────┐
│ Web: Next.js + React │ ─────────────────────────────> │ API: NestJS         │
│ giao diện và SSR     │                                 │ REST + Socket.IO    │
└──────────────────────┘                                 └──────────┬──────────┘
                                                                   │
                                      ┌────────────────────────────┼──────────────┐
                                      ▼                            ▼              ▼
                              ┌──────────────┐            ┌──────────────┐ ┌─────────────┐
                              │ PostgreSQL   │            │ Cloudinary   │ │ Email / AI  │
                              │ TypeORM       │            │ media + CDN  │ │ integrations│
                              └──────────────┘            └──────────────┘ └─────────────┘
```

Next.js được giữ làm frontend (bao gồm SSR cho trang công khai), không làm backend nghiệp vụ sau khi chuyển đổi hoàn tất. NestJS sở hữu API, xác thực, phân quyền, giao dịch dữ liệu và realtime.

## 3. Công nghệ

| Phân hệ | Công nghệ mục tiêu | Trách nhiệm |
|---|---|---|
| Web | Next.js App Router, React, TypeScript | UI, SSR, gọi API; không truy cập database trực tiếp |
| Backend | NestJS, Node.js, TypeScript | REST API, validation, nghiệp vụ, phân quyền, tích hợp |
| Database | PostgreSQL, TypeORM, migrations | Lưu tài khoản, hồ sơ, Like/Match, chat, Couple, notification |
| Authentication | JWT access/refresh token, mật khẩu băm Argon2id | Đăng nhập và xác thực HTTP/Socket; token bí mật chỉ do API quản lý |
| Realtime | Socket.IO qua NestJS Gateway | Chat, Match, Like và thông báo; xác thực token và kiểm tra quyền theo từng room |
| Media | Cloudinary SDK | Upload ảnh từ backend, quản lý `public_id`, URL an toàn và xóa media |
| Validation | DTO + class-validator hoặc Zod | Kiểm tra đầu vào ở ranh giới API; không tin dữ liệu từ client |
| API docs | Swagger/OpenAPI | Tài liệu endpoint và hợp đồng cho web/mobile |
| Testing | Vitest/Jest, Supertest, PostgreSQL test database | Unit, integration và API tests |
| Deployment | Web host riêng; NestJS host hỗ trợ Node process/WebSocket; PostgreSQL managed | Triển khai độc lập, cấu hình secrets qua environment |

Redis, hàng đợi công việc, push notification, thanh toán, AI và ứng dụng Expo là các phần mở rộng tương lai; chưa được cấu hình hay triển khai trong backend hiện tại.

## 4. Quy tắc kiến trúc và bảo mật

- Không để trình duyệt kết nối trực tiếp vào PostgreSQL hoặc giữ khóa Cloudinary/JWT.
- API phải xác thực người dùng và quyền sở hữu tài nguyên; không dựa vào việc frontend ẩn nút.
- Dùng PostgreSQL constraints và transactions cho các nghiệp vụ đồng thời như Like → Match và một Couple active trên mỗi tài khoản.
- Socket.IO xác thực khi handshake; mọi thao tác join room và gửi/nhận sự kiện phải kiểm tra thành viên hội thoại phía server.
- Không bật TypeORM `synchronize` ở bất kỳ môi trường nào; thay đổi schema đi qua migration có kiểm tra và sao lưu.
- Upload media cần giới hạn kích thước/định dạng, kiểm tra quyền, lưu `public_id` để có thể xóa ảnh đúng cách.
- Secrets chỉ nằm trong biến môi trường backend; dùng HTTPS/WSS trong môi trường triển khai.
- Bắt đầu với PostgreSQL mới; không nhập dữ liệu hoặc cấu hình từ backend cũ.

## 5. Cấu trúc dự kiến

```text
dating/
├── apps/
│   ├── web/                 # Next.js frontend, REST proxy và Socket.IO client
│   └── api/                 # NestJS API, PostgreSQL migrations, Socket.IO
├── packages/                # Chia sẻ types/domain khi monorepo được chuẩn hóa
└── docs/
```

## 6. Trạng thái triển khai

### Đã có

- `apps/api`: NestJS service mới.
- `GET /health`: kiểm tra kết nối tới PostgreSQL.
- `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout` và
  `GET /auth/me`; dùng scrypt, access JWT ngắn hạn, refresh token ngẫu nhiên có
  hash trong database và cookie `HttpOnly`.
- `GET/PATCH /users/me` cho hồ sơ; ngày sinh/toạ độ được giữ ở schema `private`.
- Cấu hình PostgreSQL qua TypeORM, connection pool có giới hạn và tắt schema
  synchronization; migration chạy tường minh qua `pnpm db:migrate`.
- Validation pipe, security headers, CORS allowlist, rate limits và xác thực
  nguồn gốc cho các mutation dùng cookie.
- Socket.IO namespace `/realtime` xác thực JWT ngắn hạn, phát sự kiện theo user room.
- REST API của web được proxy tới NestJS; frontend lấy socket token qua server.
- Cloudinary upload và các module platform, social, Couple đã được triển khai.
- Docker Compose cấu hình PostgreSQL dùng cho phát triển local.

### Còn cần xác minh/hoàn thiện

- Chạy migrations và kiểm thử các API end-to-end trên PostgreSQL thật.
- Kiểm thử Google OAuth, SMTP và Cloudinary bằng cấu hình môi trường thật.
- Hoàn thiện chat image attachments và dọn media Cloudinary khi xóa dữ liệu Couple.
- Bổ sung kiểm thử tích hợp Socket.IO và bảo đảm event/notification idempotent.

## 7. Lộ trình chuyển đổi

1. **Đã triển khai:** NestJS, PostgreSQL migrations, identity, platform, social, Couple, Cloudinary và REST proxy.
2. **Đã chuyển:** Socket.IO events cho chat, Like/Match, notifications, Couple invitations/feed.
3. **Tiếp theo:** xác minh migrations và hợp đồng API trên PostgreSQL thật, chạy E2E và kiểm thử tích hợp OAuth/SMTP/Cloudinary.
