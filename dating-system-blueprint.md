# DATING --- Tài liệu mô tả hệ thống chi tiết

> **Tên sản phẩm:** DATING (tên tiếng Anh đề xuất: A Little Closer)\
> **Phiên bản tài liệu:** 1.0\
> **Ngày:** 07/11/2026\
> **Loại tài liệu:** Product & System Blueprint\
> **Định hướng triển khai:** Web trước, Mobile App sau; dùng chung
> backend và dữ liệu.

---

# 1. Tóm tắt sản phẩm

DATING là nền tảng kết nối tình cảm gồm ba hành trình chính:

1.  **Find --- Tìm hiểu:** Người độc thân tạo hồ sơ, khám phá người phù
    hợp, Like và Match.
2.  **Connect --- Kết nối:** Hai người trò chuyện và có thể cùng xác
    nhận trở thành Couple trên nền tảng.
3.  **Keep Close --- Gắn kết:** Couple có không gian riêng với câu hỏi
    hằng ngày, thử thách, trò chơi, kỷ niệm và AI Love Assistant.

Sản phẩm có thêm hai nhóm năng lực:

- **Trust & Safety:** xác minh người thật bằng Face Liveness, chặn,
  báo cáo, kiểm soát quyền riêng tư và chống lạm dụng.
- **Relationship Transparency VIP:** thông báo nâng cao cho những
  người có VIP khi có Match mới liên quan trực tiếp đến Couple hiện
  tại.

## 1.1. Nguyên tắc cốt lõi

- Match không đồng nghĩa với Couple.
- Couple chỉ được tạo khi cả hai bên chủ động đồng ý.
- Một tài khoản chỉ có tối đa một Couple Active tại một thời điểm.
- VIP được xét độc lập theo từng người nhận thông báo; người tạo Match
  không bắt buộc phải có VIP.
- Không dùng VIP để che giấu thông tin tối thiểu cần thiết cho quyết
  định an toàn và có hiểu biết của người dùng.
- Mọi hoạt động liên quan đến dữ liệu cá nhân, sinh trắc học và chia
  sẻ sự kiện quan hệ phải minh bạch, có căn cứ xử lý phù hợp và có cơ
  chế kiểm soát.
- Backend là nguồn sự thật duy nhất cho Match, Couple, VIP, xác minh
  và thông báo.
- Web và Mobile dùng chung API, database và nghiệp vụ; không xây logic
  quan trọng riêng trong từng giao diện.

---

# 2. Mục tiêu và phạm vi

## 2.1. Mục tiêu kinh doanh

- Thu hút người dùng độc thân tham gia và tạo hồ sơ.
- Tăng tỷ lệ Like → Match → trò chuyện → Couple.
- Tăng tương tác quay lại thông qua trải nghiệm Couple.
- Tạo doanh thu định kỳ từ VIP.
- Xây dựng độ tin cậy thông qua xác minh người thật và công cụ an
  toàn.
- Tạo khác biệt so với ứng dụng chỉ tập trung vào vuốt hồ sơ.

## 2.2. Mục tiêu trải nghiệm

Người dùng cần hiểu rõ: - Họ đang ở trạng thái độc thân, đang Match hay
đang Couple trên nền tảng. - Ai có thể xem thông tin hồ sơ của họ. -
Điều gì xảy ra khi họ Like, Match, gửi lời mời Couple hoặc kết thúc
Couple. - Những sự kiện nào có thể tạo thông báo. - VIP mở khóa chính
xác quyền lợi gì. - Dữ liệu khuôn mặt và dữ liệu riêng tư được xử lý như
thế nào.

## 2.3. Ngoài phạm vi MVP

Không nên đưa ngay vào phiên bản đầu: - Video call phức tạp. -
Livestream. - Ghép đôi bằng AI tự động quyết định thay người dùng. -
Nhận diện danh tính pháp lý hoặc đối chiếu căn cước. - Đánh giá lòng
chung thủy, cảm xúc hay ý định của người dùng bằng AI. - Mạng xã hội
công khai với news feed lớn. - Hệ thống thanh toán nhiều quốc gia.

---

# 3. Nhóm người dùng và vai trò

Vai trò Mô tả

---

Guest Người chưa đăng nhập; chỉ xem nội dung giới thiệu
Member / Free Người dùng đã đăng ký gói miễn phí
VIP Member Người dùng có thuê bao VIP còn hiệu lực
Couple Member Thành viên thuộc một Couple Active
Moderator Nhân sự kiểm duyệt báo cáo và nội dung
Admin Quản trị tài khoản, gói dịch vụ, cấu hình và vận hành
System Backend, scheduler, notification worker và các tích hợp

Một người có thể đồng thời là Member/VIP Member và Couple Member. Vai
trò Moderator/Admin là quyền nội bộ, không phải trạng thái người dùng
thông thường.

---

# 4. Các khái niệm nghiệp vụ cần phân biệt

## 4.1. Like

Một người thể hiện sự quan tâm đến hồ sơ của người khác. Like đơn phương
chưa tạo Match.

## 4.2. Match

Hai người đã Like lẫn nhau. Match mở ra khả năng trò chuyện theo chính
sách sản phẩm.

## 4.3. Couple Invitation

Một người trong Match gửi lời mời trở thành Couple. Đây là lời mời
riêng, có thể được chấp nhận hoặc từ chối.

## 4.4. Couple Active

Hai người đã đồng ý và hệ thống đã tạo quan hệ Couple chính thức trên
DATING. Couple Active là cơ sở để chạy các tính năng không gian Couple
và Relationship Transparency.

**Couple Active không phải bằng chứng về hôn nhân hoặc tình trạng pháp
lý ngoài đời.** Giao diện cần gọi đây là "Couple trên DATING", tránh
tự suy diễn thành vợ/chồng hợp pháp.

## 4.5. Match mới có liên quan đến Couple

Ví dụ: - Minh và Hoa đang là Couple Active. - Minh có Match mới với Lan.

Sự kiện này liên quan trực tiếp đến: - Hoa: đối tác Couple hiện tại của
Minh. - Lan: người vừa Match với Minh. - Minh: người tạo ra Match mới.

Sự kiện chỉ được xử lý khi Match hợp lệ và Couple Active được xác nhận
tại thời điểm nghiệp vụ được ghi nhận.

---

# 5. Sơ đồ phân hệ chức năng

```text
DATING
│
├── 1. Identity & Account
│   ├── Register / Login
│   ├── Profile
│   ├── Preferences
│   └── Account Settings
│
├── 2. Trust & Safety
│   ├── Face Liveness
│   ├── Verified Human
│   ├── Block / Report
│   └── Moderation
│
├── 3. Discovery & Matching
│   ├── Discover Profiles
│   ├── Like / Pass
│   ├── Mutual Match
│   └── Match Management
│
├── 4. Chat
│   ├── Conversations
│   ├── Messages
│   └── Realtime Updates
│
├── 5. Couple
│   ├── Couple Invitation
│   ├── Couple Lifecycle
│   ├── Couple Space
│   ├── Daily Questions
│   ├── Love Challenges
│   ├── Memories
│   └── Couple Games
│
├── 6. Relationship Transparency
│   ├── Relationship Events
│   ├── Recipient VIP Entitlement
│   ├── Notification Rules
│   └── Event History
│
├── 7. AI Love Assistant
│   ├── Conversation Suggestions
│   ├── Date Ideas
│   ├── Message Drafts
│   └── Couple Activities
│
├── 8. Subscription & Payment
│   ├── Free / VIP Plans
│   ├── Checkout
│   ├── Payment Webhooks
│   └── Subscription Lifecycle
│
└── 9. Admin & Analytics
    ├── User Management
    ├── Reports
    ├── Content Management
    ├── Plan Management
    └── Product Metrics
```

---

# 6. Mô tả chức năng chi tiết

## 6.1. Đăng ký, đăng nhập và tài khoản

### Chức năng

- Đăng ký bằng số điện thoại; có thể bổ sung OAuth.
- Số điện thoại.
- Đăng nhập, đăng xuất, quên mật khẩu.
- Quản lý phiên đăng nhập và thiết bị.
- Xóa hoặc vô hiệu hóa tài khoản theo quy trình.
- Chấp nhận điều khoản sử dụng, chính sách quyền riêng tư và các thông
  báo đồng ý cần thiết.

### Hồ sơ cá nhân

Các trường gợi ý: - `display_name` - `date_of_birth` hoặc tuổi đã xác
minh theo chính sách - `gender` - `interested_in` - `bio` -
`location_coarse` (khu vực gần đúng, không công khai địa chỉ chính
xác) - `interests` - `photos` - `profile_visibility` -
`verification_status`

Không hiển thị địa chỉ nhà, vị trí chính xác hoặc dữ liệu nhạy cảm trên
hồ sơ công khai.

## 6.2. Khám phá hồ sơ (Discover)

- Đề xuất hồ sơ dựa trên tiêu chí người dùng đã chọn.
- Bộ lọc độ tuổi, khu vực gần đúng, sở thích và các tiêu chí được
  phép.
- Like hoặc Pass.
- Giới hạn tần suất và chống spam.
- Cho phép người dùng ẩn hồ sơ hoặc tạm dừng xuất hiện.
- Không tiết lộ chính xác vị trí thời gian thực của người dùng.

Gợi ý Matching ban đầu nên minh bạch: người dùng biết vì sao một hồ sơ
được đề xuất ở mức khái quát, ví dụ cùng sở thích hoặc cùng khu vực.

## 6.3. Like và Match

### Luồng

1.  A Like B.
2.  Backend lưu Like và kiểm tra B đã Like A chưa.
3.  Nếu chưa có Like ngược, trạng thái chỉ là Like đơn phương.
4.  Nếu đã có Like ngược, backend tạo Match.
5.  Backend tạo conversation hoặc cho phép mở chat theo chính sách.
6.  Backend phát sự kiện `match.created` đúng một lần.

### Quy tắc

- Không tạo Match trùng cho cùng một cặp.
- Chuẩn hóa thứ tự user ID để tránh A-B và B-A thành hai Match.
- Nếu một bên block bên kia, không cho tạo Match mới hoặc tiếp tục
  tương tác.
- Unmatch cần có trạng thái và quy tắc xử lý chat/lịch sử rõ ràng.

## 6.4. Trò chuyện

- Chat 1-1 giữa hai người đã Match.
- Tin nhắn văn bản trong MVP.
- Realtime cập nhật tin nhắn mới.
- Trạng thái đã gửi/đã đọc có thể bổ sung.
- Chặn, báo cáo và giới hạn gửi spam.
- Chính sách lưu trữ và xóa tin nhắn phải được công bố.

Không cho người dùng truy cập conversation chỉ bằng cách đoán ID;
NestJS phải xác minh họ là thành viên cuộc trò chuyện.

## 6.5. Couple Invitation và vòng đời Couple

### Luồng tạo Couple

1.  Hai người đã Match.
2.  A gửi lời mời Couple cho B.
3.  B nhận thông báo lời mời.
4.  B đồng ý hoặc từ chối.
5.  Khi B đồng ý, backend kiểm tra cả hai chưa có Couple Active khác.
6.  Backend tạo Couple và hai bản ghi thành viên trong transaction.
7.  Phát sự kiện `couple.activated`.
8.  Tạo Couple Space.

### Quy tắc

- Một tài khoản chỉ có tối đa một Couple Active.
- Không được tạo Couple nếu một trong hai tài khoản đang có Couple
  Active khác.
- Lời mời có hạn dùng; thời hạn có thể cấu hình.
- Người nhận có thể từ chối hoặc bỏ qua.
- Kết thúc Couple cần xác nhận rõ ràng.
- Khi Couple kết thúc, trạng thái chuyển thành `ended`, không xóa vật
  lý lịch sử cần thiết.
- Sau khi kết thúc, quyền truy cập Couple Space phải được xử lý theo
  chính sách đã công bố.
- Không tự động chuyển một Match thành Couple.

### Trạng thái đề xuất

Trạng thái Ý nghĩa

---

`pending` Đang chờ người nhận
`accepted` Được chấp nhận, đang chờ backend tạo Couple
`rejected` Bị từ chối
`expired` Hết hạn
`active` Couple đang hoạt động
`ended` Couple đã kết thúc

Có thể tách `couple_invitations.status` và `couples.status` thành hai
lifecycle riêng để tránh nhập nhằng.

## 6.6. Couple Space

Mỗi Couple Active có không gian riêng: - Ngày bắt đầu và bộ đếm thời
gian bên nhau. - Câu hỏi mỗi ngày. - Thử thách tình yêu. - Trò chơi đoán
câu trả lời. - Nhật ký và kỷ niệm. - Album ảnh riêng. - Lịch hẹn hò và
ngày kỷ niệm. - AI gợi ý hoạt động.

### Daily Questions

- Mỗi ngày chọn một câu hỏi theo lịch.
- Mỗi thành viên trả lời riêng.
- Có thể đặt quy tắc chỉ mở câu trả lời sau khi cả hai cùng trả lời.
- Cho phép bỏ qua câu hỏi.
- Nội dung trả lời chỉ thành viên Couple được phép truy cập.

### Love Challenges

- Thử thách có thời hạn.
- Hai người có thể cùng hoàn thành.
- Lưu trạng thái và thời gian hoàn thành.
- Không biến điểm số thành đánh giá chất lượng tình yêu.

### Memories

- Lưu tiêu đề, mô tả, ngày và media.
- Quyền xem chỉ giới hạn trong Couple.
- Có chính sách xuất hoặc xóa dữ liệu khi Couple kết thúc.

## 6.7. Relationship Transparency VIP

### Mục đích

Thông báo nâng cao cho từng người nhận khi có Match mới liên quan trực
tiếp đến Couple Active.

### Kịch bản chuẩn

- Minh và Hoa đang Couple Active.
- Minh có Match mới với Lan.
- Backend ghi nhận `match.created`.
- Backend xác định Minh có Couple Active với Hoa tại thời điểm sự
  kiện.
- Kiểm tra VIP của Hoa và Lan độc lập.

### Quy tắc VIP

Hoa (Couple hiện tại) Lan (Match mới) Thông báo VIP

---

VIP VIP Gửi cho Hoa và Lan
VIP Free Chỉ gửi cho Hoa
Free VIP Chỉ gửi cho Lan
Free Free Không gửi thông báo VIP

**Minh không cần VIP.** Người tạo Match không phải điều kiện để kích
hoạt quyền thông báo của Hoa hoặc Lan.

### Nội dung thông báo đề xuất

Cho Hoa: \> Minh, người đang là Couple với bạn trên DATING, vừa có một
Match mới.

Cho Lan: \> Người bạn vừa Match hiện đang có Couple Active với một người
khác trên DATING. Bạn có thể cân nhắc trước khi tiếp tục kết nối.

### Phân biệt thông báo VIP và cảnh báo cơ bản

Đây là quyết định sản phẩm cần giữ rõ: - VIP có thể mở khóa thông báo
nâng cao, lịch sử sự kiện và chi tiết được phép chia sẻ. - Trạng thái
Couple Active cơ bản có thể là thông tin quan trọng đối với người mới
trước khi họ quyết định tiếp tục trò chuyện. Không nên cố tình tạo ấn
tượng rằng người đó độc thân chỉ vì người nhận không có VIP. - Nếu sản
phẩm quyết định không gửi thông báo push cho Free, vẫn cần xem xét hiển
thị cảnh báo cơ bản trong luồng Match hoặc trước khi bắt đầu tương tác
sâu. - Cần giải thích cho người dùng từ lúc đăng ký rằng một số sự kiện
Match có thể được chia sẻ theo quy tắc đã công bố và sự đồng ý phù hợp.

### Điều kiện xử lý

- Chỉ xử lý Match hợp lệ, không xử lý Like đơn phương.
- Couple phải là `active` tại thời điểm sự kiện.
- Không gửi trùng cho cùng một sự kiện/người nhận.
- Kiểm tra VIP ở backend theo thời điểm gửi hoặc theo chính sách
  entitlement được định nghĩa.
- Nếu Couple đã kết thúc trước khi sự kiện được xử lý, không gửi thông
  báo với tư cách đối tác hiện tại.
- Nếu một người block người còn lại, chính sách an toàn có quyền ưu
  tiên.
- Không tiết lộ nội dung chat, thông tin liên hệ hoặc dữ liệu riêng tư
  của bên thứ ba.

## 6.8. Xác minh người thật --- Face Liveness

### Mục tiêu

Giảm việc dùng ảnh tĩnh, video quay sẵn hoặc một số phương thức giả mạo
để tạo tài khoản không phải người thật.

### Không đồng nhất hai khái niệm

- Face Detection: phát hiện có khuôn mặt.
- Face Liveness: đánh giá phiên camera có dấu hiệu là người thật đang
  hiện diện.
- Face Identity Verification: so sánh khuôn mặt với một danh tính/ảnh
  tham chiếu khác.

MVP chỉ cần Face Liveness nếu mục tiêu là xác minh người thật; không cần
nhận diện tên hoặc đối chiếu căn cước.

### Luồng

1.  Người dùng xem giải thích và đồng ý xử lý.
2.  Frontend yêu cầu camera.
3.  Backend tạo phiên xác minh với nhà cung cấp.
4.  SDK thực hiện phiên liveness.
5.  Backend lấy kết quả trực tiếp từ nhà cung cấp.
6.  Backend xác minh session, kết quả và ngưỡng.
7.  Cập nhật `verification_status`.
8.  Hiển thị nhãn Verified Human nếu đạt.

### Nguyên tắc

- Không tin kết quả do frontend tự gửi.
- Không lưu video/ảnh sinh trắc học lâu hơn mức cần thiết.
- Chọn region/nhà cung cấp phù hợp với thị trường và quy định.
- Có phương án hỗ trợ nếu người dùng không thể xác minh bằng camera.
- Nhãn Verified Human chỉ có nghĩa là phiên liveness đạt; không khẳng
  định danh tính pháp lý, tuổi, tình trạng hôn nhân hoặc mức độ đáng
  tin cậy tuyệt đối.

## 6.9. AI Love Assistant

Tính năng: - Gợi ý mở đầu cuộc trò chuyện. - Viết lời nhắn, lời chúc
hoặc thư tình. - Gợi ý buổi hẹn theo sở thích và ngân sách. - Tạo câu
hỏi và thử thách Couple. - Gợi ý cách trao đổi bình tĩnh khi có bất
đồng.

Nguyên tắc: - AI chỉ hỗ trợ, không thay thế tư vấn chuyên môn. - Không
khẳng định người khác đang ngoại tình, nói dối hoặc có cảm xúc cụ thể. -
Không sử dụng nội dung chat riêng để huấn luyện hoặc gửi sang dịch vụ AI
nếu chưa có cơ sở xử lý và thông báo phù hợp. - Cho phép người dùng xóa
lịch sử AI nếu có lưu.

## 6.10. Subscription và thanh toán

### Gói Free

- Tạo hồ sơ.
- Khám phá và Like theo giới hạn sản phẩm.
- Match và chat cơ bản.
- Tạo Couple.
- Một số câu hỏi và thử thách.
- Cảnh báo trạng thái quan hệ cơ bản cần thiết để người dùng đưa ra
  quyết định có hiểu biết.

### Gói VIP

- Nhận thông báo Relationship Transparency nâng cao nếu chính người
  nhận có VIP.
- Xem lịch sử sự kiện trong phạm vi được phép.
- Bộ câu hỏi và thử thách nâng cao.
- Hạn mức AI cao hơn.
- Các tiện ích cao cấp khác.

### Giá thử nghiệm

Gói Giá tham khảo

---

1 tháng 79.000đ
3 tháng 199.000đ
12 tháng 599.000đ

Giá trên chỉ là giả định để thử nghiệm, không phải báo giá đã xác thực.

### Trạng thái subscription

- `pending`
- `active`
- `past_due`
- `expired`
- `cancelled`
- `refunded`

Backend phải xác minh thanh toán qua webhook/chữ ký nhà cung cấp. Không
nâng VIP chỉ dựa trên redirect thành công từ frontend.

---

# 7. Kiến trúc kỹ thuật đề xuất

## 7.1. Công nghệ

---

Lớp Công nghệ đề xuất

---

Web Next.js + TypeScript

Mobile React Native + Expo

UI Web Tailwind CSS

UI Mobile React Native StyleSheet hoặc
NativeWind

Backend API NestJS (REST API)

Database PostgreSQL, TypeORM migrations

Auth NestJS JWT access/refresh, email verification và Google OAuth

Realtime Socket.IO qua NestJS Gateway

Storage Cloudinary

Validation Zod

State Zustand (chỉ cho state phía client
cần thiết)

AI OpenRouter API

Face Liveness AWS Rekognition Face Liveness hoặc
dịch vụ tương đương

Push Expo Notifications và Web Push

Payment Cổng thanh toán phù hợp thị trường

Hosting Vercel hoặc hạ tầng tương đương

Monitoring Error tracking, logs và product
analytics

---

## 7.2. Kiến trúc tổng thể

```text
                 ┌─────────────────────┐
                 │      Web App        │
                 │      Next.js        │
                 └──────────┬──────────┘
                            │
                 ┌──────────▼──────────┐
                 │     Mobile App      │
                 │  React Native Expo  │
                 └──────────┬──────────┘
                            │ HTTPS API
                 ┌──────────▼──────────┐
                 │ NestJS API         │
                 │ Auth / Match /     │
                 │ Couple / Realtime │
                 └─────┬────────┬────┘
                       │        │
             ┌─────────▼───┐ ┌──▼───────────────┐
             │ PostgreSQL  │ │ Cloudinary /     │
             │ TypeORM     │ │ External Services│
             │ migrations  │ │ AI / Liveness /  │
             └─────────────┘ └──────────────────┘
```

## 7.3. Monorepo

Đề xuất quản lý Web và Mobile trong một repository:

```text
dating/
├── apps/
│   ├── web/                    # Next.js
│   └── mobile/                 # Expo React Native
│
├── packages/
│   ├── shared/                 # Types, enums, constants
│   ├── validation/             # Zod schemas
│   ├── api-client/             # API client dùng chung
│   ├── domain/                 # Domain rules thuần TypeScript
│   └── config/                 # Shared configs
│
├── docs/
│   ├── PRODUCT_SPEC.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE_SCHEMA.md
│   └── API_SPEC.md
│
├── package.json
└── README.md
```

Không cố chia sẻ UI giữa web và mobile. Nên chia sẻ domain types,
validation, API client và logic thuần TypeScript; giao diện được xây
riêng cho từng nền tảng.

## 7.4. Ranh giới trách nhiệm

**Frontend** - Hiển thị giao diện. - Thu thập thao tác người dùng. - Gọi
API. - Quản lý state giao diện. - Không tự quyết định VIP, Couple Active
hoặc trạng thái xác minh.

**Backend** - Xác thực người dùng. - Kiểm tra quyền. - Thực thi nghiệp
vụ. - Ghi database. - Tạo event và notification. - Gọi dịch vụ ngoài
bằng secret được bảo vệ.

**Database** - Lưu trạng thái chính thức. - Enforce unique constraints
và foreign keys. Quyền truy cập được kiểm tra ở NestJS; client không
được kết nối hoặc ghi trực tiếp vào PostgreSQL.

---

# 8. Thiết kế database mức hệ thống

Đây là danh sách bảng logic ban đầu. Kiểu dữ liệu và constraint chi tiết
sẽ được chốt trong tài liệu Database Schema riêng.

## 8.1. Account & Profile

### `profiles`

- `id` UUID, liên kết `auth.users.id`
- `display_name`
- `date_of_birth` hoặc trường tuổi phù hợp chính sách
- `gender`
- `bio`
- `coarse_location`
- `verification_status`
- `created_at`
- `updated_at`

### `user_preferences`

- `user_id`
- `interested_in`
- `age_min`
- `age_max`
- `max_distance`
- `interests`
- `discovery_enabled`

### `user_settings`

- `user_id`
- `profile_visibility`
- `push_enabled`
- `email_enabled`
- `privacy_preferences`

## 8.2. Trust & Safety

### `face_verifications`

- `id`
- `user_id`
- `provider`
- `provider_session_id`
- `status`
- `result_metadata` (chỉ dữ liệu tối thiểu)
- `created_at`
- `completed_at`

### `blocks`

- `id`
- `blocker_id`
- `blocked_id`
- `created_at`

### `reports`

- `id`
- `reporter_id`
- `reported_user_id`
- `reason`
- `description`
- `status`
- `created_at`
- `resolved_at`

## 8.3. Matching & Chat

### `likes`

- `id`
- `from_user_id`
- `to_user_id`
- `action` (like/pass)
- `created_at`

Constraint: một cặp người gửi/nhận chỉ có bản ghi hợp lệ theo chính
sách; không cho tự Like chính mình.

### `matches`

- `id`
- `user_low_id`
- `user_high_id`
- `status`
- `created_at`
- `ended_at`

Constraint: `user_low_id < user_high_id` theo thứ tự UUID để tránh match
trùng.

### `conversations`

- `id`
- `match_id`
- `created_at`
- `status`

### `messages`

- `id`
- `conversation_id`
- `sender_id`
- `content`
- `created_at`
- `deleted_at`

## 8.4. Couple

### `couple_invitations`

- `id`
- `sender_id`
- `receiver_id`
- `status`
- `expires_at`
- `created_at`
- `responded_at`

### `couples`

- `id`
- `status` (active/ended)
- `started_at`
- `ended_at`
- `ended_by`

### `couple_members`

- `couple_id`
- `user_id`
- `joined_at`
- `left_at`

Constraint quan trọng: - Mỗi user chỉ có tối đa một membership đang
active. - Tạo Couple và membership phải diễn ra trong transaction. -
Chặn việc một user thuộc hai Couple Active do hai request đồng thời.

## 8.5. Couple Space

### `daily_questions`

- `id`
- `question_text`
- `category`
- `is_active`

### `couple_question_sessions`

- `id`
- `couple_id`
- `question_id`
- `scheduled_date`
- `status`

### `couple_answers`

- `id`
- `session_id`
- `user_id`
- `answer`
- `created_at`

### `love_challenges`

- `id`
- `title`
- `description`
- `duration_days`
- `is_active`

### `couple_challenge_progress`

- `id`
- `couple_id`
- `challenge_id`
- `status`
- `started_at`
- `completed_at`

### `memories`

- `id`
- `couple_id`
- `created_by`
- `title`
- `description`
- `media_path`
- `memory_date`
- `created_at`

## 8.6. VIP & Relationship Transparency

### `user_subscriptions`

- `id`
- `user_id`
- `plan_code`
- `status`
- `starts_at`
- `expires_at`
- `provider`
- `provider_reference`
- `created_at`

### `relationship_events`

- `id`
- `event_type`
- `actor_id`
- `match_id`
- `current_couple_id`
- `current_partner_id`
- `new_match_partner_id`
- `occurred_at`
- `metadata_minimal`

### `notifications`

- `id`
- `recipient_id`
- `event_id`
- `type`
- `title`
- `body`
- `read_at`
- `created_at`

### `notification_deliveries`

- `id`
- `notification_id`
- `channel`
- `status`
- `attempt_count`
- `last_attempt_at`
- `provider_message_id`

Unique constraint gợi ý: một event chỉ tạo một notification cho cùng một
recipient và type.

## 8.7. AI

### `ai_conversations`

- `id`
- `user_id`
- `context_type`
- `created_at`

### `ai_messages`

- `id`
- `conversation_id`
- `role`
- `content`
- `created_at`

Chỉ lưu nếu người dùng được thông báo và đồng ý theo chính sách dữ liệu.

---

# 9. API nghiệp vụ dự kiến

Tên endpoint chỉ là đề xuất, có thể điều chỉnh theo quy ước dự án.

## 9.1. Profile

Method Endpoint Mục đích

---

GET `/api/me` Lấy hồ sơ hiện tại
PATCH `/api/me/profile` Cập nhật hồ sơ
GET `/api/profiles/:id` Xem hồ sơ theo quyền

## 9.2. Matching

Method Endpoint Mục đích

---

GET `/api/discover` Lấy hồ sơ khám phá
POST `/api/likes` Like hoặc Pass
GET `/api/matches` Danh sách Match
POST `/api/matches/:id/unmatch` Hủy Match

## 9.3. Couple

Method Endpoint Mục đích

---

POST `/api/couple-invitations` Gửi lời mời Couple
POST `/api/couple-invitations/:id/accept` Chấp nhận
POST `/api/couple-invitations/:id/reject` Từ chối
GET `/api/couple/me` Lấy Couple hiện tại
POST `/api/couple/:id/end` Kết thúc Couple

## 9.4. Relationship Transparency

---

Method Endpoint Mục đích

---

GET `/api/relationship-events` Lấy sự kiện mà user có
quyền xem

GET `/api/notifications` Danh sách thông báo

POST `/api/notifications/:id/read` Đánh dấu đã đọc

PATCH `/api/me/notification-settings` Cập nhật tùy chọn thông
báo

---

Client không được gọi API kiểu `POST /notify-partner` để tự quyết định
người nhận. Việc tạo event và chọn recipient phải do backend thực hiện
sau khi xác minh Match và Couple.

## 9.5. Face Liveness

---

Method Endpoint Mục đích

---

POST `/api/verification/liveness-session` Backend tạo phiên

POST `/api/verification/liveness-result` Backend kiểm tra kết
quả

GET `/api/verification/status` Lấy trạng thái xác minh

---

Secret của nhà cung cấp chỉ nằm ở backend.

## 9.6. Subscription

Method Endpoint Mục đích

---

GET `/api/subscription/me` Lấy gói hiện tại
POST `/api/subscription/checkout` Tạo yêu cầu thanh toán
POST `/api/webhooks/payment` Nhận webhook thanh toán

Webhook phải xác thực chữ ký, chống replay và xử lý idempotent.

---

# 10. Quy trình event và notification

## 10.1. Nguyên tắc

Không gửi thông báo trực tiếp từ component frontend. Backend tạo event
sau khi transaction nghiệp vụ thành công; notification worker xử lý gửi.

## 10.2. Luồng Match mới liên quan đến Couple

```text
User A và User B Like lẫn nhau
              |
              v
      Backend xác nhận Match
              |
              v
      Ghi Match thành công
              |
              v
       Phát match.created
              |
              v
  Kiểm tra Couple Active của actor
              |
        Có Couple Active?
          /          \
        Không         Có
         |             |
         v             v
    Kết thúc       Xác định partner
                       |
                       v
             Tạo relationship event
                       |
                       v
          Xét VIP từng người nhận độc lập
                 /             \
          Partner hiện tại    Người Match mới
                 |                 |
           Có VIP không?      Có VIP không?
                 |                 |
             Có: gửi           Có: gửi
             Không: bỏ         Không: bỏ
```

## 10.3. Pseudocode tham khảo

```ts
async function handleMatchCreated(matchId: string) {
  // Tất cả truy vấn và thay đổi trạng thái nhạy cảm
  // phải thực hiện trong backend.
  const match = await getValidMatch(matchId);

  if (!match) return;

  const actor = await resolveActorForMatch(match);
  const newPartner = await resolveOtherUser(match, actor.id);

  const activeCouple = await getActiveCouple(actor.id);

  if (!activeCouple) return;

  const currentPartner = await getOtherCoupleMember(activeCouple.id, actor.id);

  const event = await createRelationshipEventIdempotently({
    eventType: 'partner_new_match',
    actorId: actor.id,
    matchId,
    currentCoupleId: activeCouple.id,
    currentPartnerId: currentPartner.id,
    newMatchPartnerId: newPartner.id,
  });

  if (!event.created) return;

  const recipients = [currentPartner, newPartner];

  for (const recipient of recipients) {
    const hasVip = await hasActiveVip(recipient.id);

    if (!hasVip) continue;

    await enqueueNotificationOnce({
      eventId: event.id,
      recipientId: recipient.id,
      type: 'relationship_transparency',
    });
  }
}
```

Đây là pseudocode mô tả nghiệp vụ, chưa phải code production. Cần xác
định actor một cách chính xác từ luồng Match, dùng transaction/outbox,
chống race condition, xử lý retry và kiểm tra quyền truy cập.

## 10.4. Idempotency và race condition

Các trường hợp phải xử lý: - Hai Like đến gần như đồng thời. - Một user
có hai Match mới cùng lúc. - Couple kết thúc đúng lúc Match được tạo. -
VIP hết hạn trong lúc worker đang gửi. - Webhook thanh toán được gửi
lặp. - Worker retry khiến notification bị gửi trùng.

Giải pháp: - Unique constraints cho Match và notification. - Transaction
cho thay đổi Couple. - Event/outbox table hoặc hàng đợi bền vững. -
Idempotency key. - Chốt rõ thời điểm kiểm tra VIP: lúc event được tạo
hay lúc notification được gửi. Khuyến nghị kiểm tra lại entitlement
trước khi giao thông báo VIP. - Lưu kết quả xử lý để retry an toàn.

---

# 11. Bảo mật, quyền riêng tư và an toàn

## 11.1. Authentication và Authorization

- Dùng NestJS JWT access/refresh và kiểm tra quyền ở backend.
- Mọi API kiểm tra user ID từ session/token đã xác thực.
- Không tin `user_id`, `is_vip`, `couple_status` do client truyền lên.
- PostgreSQL chỉ được truy cập từ NestJS; kiểm tra quyền thành viên và
  quyền sở hữu ở từng endpoint.

## 11.2. Dữ liệu riêng tư

- Chỉ thu thập dữ liệu cần thiết.
- Vị trí chỉ nên dùng ở mức khu vực gần đúng nếu không cần định vị
  chính xác.
- Tách hồ sơ công khai khỏi dữ liệu nội bộ.
- Không công khai lịch sử Match cho người không có quyền.
- Không chia sẻ nội dung chat cho đối tác Couple hoặc người Match mới.
- Có thời hạn lưu và quy trình xóa dữ liệu.

## 11.3. Dữ liệu sinh trắc học

- Giải thích riêng về mục đích và cách xử lý.
- Chỉ xử lý khi có căn cứ phù hợp và sự đồng ý cần thiết.
- Hạn chế lưu ảnh/video gốc.
- Không dùng Face Liveness để tuyên bố xác minh danh tính pháp lý.
- Có quy trình xử lý sự cố và yêu cầu xóa.

## 11.4. Chống lạm dụng

- Rate limit Like, chat, gửi lời mời và xác minh.
- Phát hiện spam và tài khoản tự động.
- Chặn và báo cáo dễ truy cập.
- Có quy trình kiểm duyệt và kháng nghị.
- Không tiết lộ cho người bị chặn những thông tin giúp họ tiếp tục
  theo dõi người chặn.

## 11.5. Minh bạch sản phẩm

- Giải thích Relationship Transparency trước khi người dùng bật hoặc
  sử dụng.
- Cho người dùng quản lý thông báo và lựa chọn quyền riêng tư phù hợp.
- Không mô tả Couple trên app là hôn nhân pháp lý.
- Không tạo kết luận đạo đức về người có Match mới.
- VIP không được làm giảm mức bảo vệ an toàn cơ bản.

---

# 12. Giao diện và trải nghiệm người dùng

## 12.1. Điều hướng chính trên Mobile

Thanh điều hướng gợi ý: 1. Discover 2. Likes/Matches 3. Chat 4. Couple 5. Profile

Notification có thể đặt ở header.

## 12.2. Điều hướng trên Web

- Sidebar hoặc top navigation.
- Discover và hồ sơ.
- Matches và Chat.
- Couple Space.
- VIP.
- Settings và Safety.

## 12.3. Màn hình cần thiết

Màn hình Mục tiêu

---

Landing Giới thiệu DATING
Onboarding Hướng dẫn và thiết lập ban đầu
Register/Login Tài khoản
Profile Setup Tạo hồ sơ
Verification Xác minh người thật
Discover Khám phá
Profile Detail Xem hồ sơ
Match Success Thông báo Match
Chat Trò chuyện
Couple Invitation Xác nhận Couple
Couple Home Trang chính Couple
Daily Question Câu hỏi hằng ngày
Challenge Thử thách
Memories Kỷ niệm
Notifications Thông báo
VIP Quyền lợi và thanh toán
Privacy & Safety Quyền riêng tư và an toàn
Admin Quản trị

## 12.4. Định hướng visual

- Tông màu: hồng phấn, kem, nâu đỏ nhẹ.
- Cảm giác: tinh tế, ấm áp, trưởng thành, không quá sến.
- Ưu tiên mobile-first.
- Animation nhẹ và có thể tắt theo cài đặt hệ thống.
- Nội dung rõ ràng, tránh dùng màu sắc hoặc biểu tượng khiến cảnh báo
  quan hệ giống thông báo khẩn cấp nếu không cần thiết.

---

# 13. Admin và vận hành

Admin portal cần có: - Tìm kiếm và xem trạng thái tài khoản theo
quyền. - Xử lý báo cáo và kháng nghị. - Quản lý nội dung câu hỏi, thử
thách. - Quản lý gói VIP, giá và chương trình khuyến mãi. - Theo dõi
giao dịch và webhook. - Theo dõi tỷ lệ xác minh thành công/thất bại. -
Theo dõi lỗi notification. - Cấu hình ngưỡng và giới hạn hệ thống. -
Audit log cho thao tác quản trị.

Không cho admin thông thường đọc nội dung chat hoặc dữ liệu Couple riêng
tư nếu không có quy trình, lý do và quyền truy cập được kiểm soát.

---

# 14. Analytics và chỉ số thành công

## Acquisition

- Số lượt đăng ký.
- Chi phí có một người dùng mới (nếu chạy quảng cáo).
- Tỷ lệ hoàn thành onboarding.

## Activation

- Tỷ lệ hoàn thành hồ sơ.
- Tỷ lệ có Like đầu tiên.
- Thời gian đến Match đầu tiên.
- Tỷ lệ xác minh người thật.

## Engagement

- Số Match trên người dùng hoạt động.
- Tỷ lệ Match bắt đầu trò chuyện.
- Số phiên chat.
- Số Couple Active.
- Tỷ lệ sử dụng câu hỏi và thử thách.

## Retention

- D1, D7, D30 retention.
- Tỷ lệ quay lại của Couple.
- Tỷ lệ Couple còn Active sau 30/90 ngày.

## Revenue

- Free → VIP conversion.
- Monthly recurring revenue.
- Tỷ lệ gia hạn.
- Churn VIP.
- Doanh thu trung bình trên người dùng trả phí.

## Safety

- Tỷ lệ báo cáo.
- Thời gian xử lý báo cáo.
- Tỷ lệ xác minh thất bại.
- Số tài khoản bị khóa do lạm dụng.
- Tỷ lệ notification gửi trùng hoặc sai người nhận.

Không dùng số lượng Match hoặc thời gian sử dụng làm chỉ số duy nhất;
cần cân bằng với chất lượng kết nối và an toàn.

---

# 15. Kế hoạch triển khai theo giai đoạn

## Phase 0 --- Product Foundation

- Chốt nghiệp vụ Match, Couple, VIP.
- Chốt quy tắc quyền riêng tư và thông báo.
- Thiết kế UI/UX.
- Thiết kế schema database.
- Thiết lập monorepo, CI/CD, môi trường dev/staging/prod.

## Phase 1 --- MVP Matching

- Auth.
- Profile.
- Preferences.
- Discover.
- Like/Pass.
- Match.
- Chat cơ bản.
- Block/Report.
- Admin tối thiểu.

## Phase 2 --- Couple Experience

- Couple Invitation.
- Couple Active lifecycle.
- Couple Space.
- Daily Questions.
- Love Challenges.
- Memories.
- Notification cơ bản.

## Phase 3 --- VIP & Payment

- Subscription.
- Payment provider.
- Webhook.
- VIP entitlement.
- Relationship Transparency event processing.
- Notification history và quyền xem.

## Phase 4 --- Trust & AI

- Face Liveness.
- Verified Human badge.
- AI Love Assistant.
- Nội dung và trò chơi nâng cao.
- Monitoring và chống lạm dụng nâng cao.

## Phase 5 --- Mobile App

- Tạo app Expo React Native.
- Dùng chung API và packages.
- Push notification.
- Camera/Face Liveness SDK tương thích.
- Deep links.
- Kiểm thử iOS và Android.
- Chuẩn bị phát hành App Store và Google Play.

---

# 16. Định hướng Web trước, App sau

## 16.1. Nguyên tắc

Xây backend và domain logic độc lập với giao diện. Web và Mobile là hai
client của cùng một hệ thống.

## 16.2. Có thể chia sẻ

- TypeScript types.
- Zod validation.
- API client.
- Domain rules thuần.
- Constants và enums.
- Một phần utility functions.

## 16.3. Không nên cố chia sẻ

- Toàn bộ UI component.
- Routing.
- Camera lifecycle.
- Push notification implementation.
- Payment UI.
- Quyền truy cập thiết bị.

## 16.4. Khi chuyển sang Mobile

Không cần tạo database mới. Mobile đăng nhập cùng hệ thống, gọi cùng
backend và đọc cùng dữ liệu theo quyền. Cần bổ sung: - Push token theo
thiết bị. - Deep links. - Camera permission. - App lifecycle. -
Mobile-specific liveness SDK. - Store billing nếu phân phối gói số qua
App Store/Google Play và chính sách nền tảng yêu cầu.

---

# 17. Tiêu chí nghiệm thu MVP

MVP chỉ được xem là đạt khi:

### Account

- Người dùng đăng ký, đăng nhập, đăng xuất được.
- Người dùng sửa hồ sơ và cài đặt quyền riêng tư được.

### Matching

- Like đơn phương không tạo Match.
- Hai Like tương hỗ tạo đúng một Match.
- Không thể tự Match với chính mình.
- Block ngăn tương tác theo đúng chính sách.

### Couple

- Chỉ Match mới gửi được lời mời Couple.
- Chỉ khi cả hai đồng ý mới tạo Couple Active.
- Một user không thể có hai Couple Active.
- Kết thúc Couple cập nhật trạng thái chính xác.

### Relationship Transparency

- Match mới của một người đang có Couple Active tạo đúng một
  relationship event.
- Người Couple hiện tại được xét VIP độc lập.
- Người Match mới được xét VIP độc lập.
- Người tạo Match không cần VIP.
- Không gửi trùng thông báo.
- Không gửi thông báo cho người không liên quan.
- Không tiết lộ nội dung chat hoặc dữ liệu riêng tư.
- Trạng thái Couple Active cơ bản được trình bày minh bạch theo chính
  sách sản phẩm.

### VIP

- VIP chỉ active sau khi backend xác minh thanh toán.
- VIP hết hạn thì quyền VIP bị thu hồi đúng thời điểm.
- Không thể tự sửa `is_vip` từ client.

### Face Liveness

- Backend tạo và xác minh session.
- Frontend không thể tự đánh dấu verified.
- Kết quả thất bại không tạo Verified Human badge.
- Có thông tin giải thích và cơ chế xử lý dữ liệu phù hợp.

### Security

- NestJS kiểm tra quyền sở hữu và thành viên trước khi trả dữ liệu người dùng.
- User A không đọc được dữ liệu riêng tư của User B nếu không có
  quyền.
- Secret không xuất hiện trong bundle frontend.
- Các API nhạy cảm có rate limit và authorization.

---

# 18. Các quyết định cần chốt trước khi code

Danh sách dưới đây là các quyết định sản phẩm còn cần xác nhận, không
nên tự giả định khi triển khai:

1.  Độ tuổi tối thiểu và thị trường phát hành ban đầu.
2.  Cho phép trò chuyện ngay sau Match hay cần một bên gửi lời chào.
3.  Thời hạn Couple Invitation.
4.  Khi kết thúc Couple, dữ liệu Couple Space được giữ, xuất hay xóa như
    thế nào.
5.  Chính sách unmatch và block đối với lịch sử chat.
6.  Relationship Transparency có gửi push, hiển thị in-app hay cả hai.
7.  Cảnh báo Couple Active cơ bản cho người mới được hiển thị ở bước
    nào.
8.  Sự đồng ý nào cần có trước khi chia sẻ Match event.
9.  Thời gian lưu Relationship Event và notification.
10. Nhà cung cấp Face Liveness, khu vực xử lý dữ liệu và chi phí.
11. Cổng thanh toán và cách xử lý subscription trên Web/Mobile.
12. Nội dung nào của Couple Space được phép xuất sau khi kết thúc
    Couple.

---

# 19. Kết luận và định vị sản phẩm

DATING không chỉ là ứng dụng tìm người yêu. Sản phẩm kết hợp:

- **Find:** khám phá và tìm người phù hợp.
- **Connect:** Match, trò chuyện và xác nhận Couple.
- **Keep Close:** hoạt động giúp các cặp đôi duy trì kết nối.
- **Trust:** xác minh người thật và công cụ an toàn.
- **Transparency:** thông tin minh bạch về các sự kiện kết nối có liên
  quan.
- **AI:** hỗ trợ giao tiếp, ý tưởng hẹn hò và hoạt động tình cảm.

Điểm khác biệt thương mại là trải nghiệm Couple và Relationship
Transparency VIP. Trong đó, quyền VIP được kiểm tra độc lập theo từng
người nhận thông báo; người tạo ra Match không cần VIP. Các cảnh báo cơ
bản có ảnh hưởng đến quyết định kết nối cần được thiết kế minh bạch và
có trách nhiệm, không bị che giấu chỉ vì người dùng chưa trả phí.

**Định hướng kỹ thuật cuối cùng:** Next.js + TypeScript cho Web, React
Native + Expo cho Mobile về sau, NestJS quản lý API và nghiệp vụ, PostgreSQL
làm nền dữ liệu, Socket.IO cho realtime và Cloudinary lưu ảnh. Xây Web trước
nhưng thiết kế API-first để mở rộng sang App mà không phải viết lại hệ thống lõi.
