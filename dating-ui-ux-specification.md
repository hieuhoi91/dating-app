# DATING — UI/UX SPECIFICATION

## Tài liệu mô tả giao diện và các trang của website

- **Tên sản phẩm:** DATING
- **Tên tiếng Anh tham khảo:** A Little Closer
- **Loại tài liệu:** UI/UX Specification — Web
- **Phiên bản:** 1.0
- **Ngày:** 07/11/2026
- **Mục đích:** Mô tả cấu trúc trang, bố cục, thành phần giao diện, trạng thái và luồng thao tác để thiết kế Figma hoặc triển khai bằng Next.js.

---

# 1. Định hướng thiết kế

## 1.1. Tinh thần sản phẩm

DATING là nền tảng kết nối và phát triển mối quan hệ. Giao diện cần tạo cảm giác:

- Ấm áp, gần gũi, tinh tế và đáng tin cậy.
- Có cảm xúc nhưng không sến, không giống một trò chơi hẹn hò.
- Riêng tư, an toàn và minh bạch về trạng thái kết nối.
- Tập trung vào con người, hình ảnh và những cuộc trò chuyện có ý nghĩa.

## 1.2. Phong cách thị giác đề xuất

| Hạng mục    | Định hướng                                                |
| ----------- | --------------------------------------------------------- |
| Phong cách  | Modern, warm, minimal, romantic                           |
| Màu nền     | Kem nhạt / trắng ấm                                       |
| Màu chính   | Rose / dusty pink hoặc burgundy dịu                       |
| Màu phụ     | Beige, lavender nhạt, sage green                          |
| Màu chữ     | Nâu đậm / charcoal, tránh đen tuyệt đối                   |
| Bo góc      | 12–20px, nhất quán                                        |
| Đổ bóng     | Nhẹ, chỉ dùng để phân cấp                                 |
| Hình ảnh    | Ảnh chân dung tự nhiên, ánh sáng mềm, không quá chỉnh sửa |
| Icon        | Line icon đơn giản, cùng một bộ icon                      |
| Chuyển động | Nhẹ, có chủ đích; tránh animation gây mất tập trung       |

### Bảng màu tham khảo

| Token          | Màu       | Công dụng              |
| -------------- | --------- | ---------------------- |
| `primary`      | `#B85C72` | CTA chính, điểm nhấn   |
| `primary-dark` | `#914257` | Hover, trạng thái nhấn |
| `background`   | `#FBF8F6` | Nền tổng thể           |
| `surface`      | `#FFFFFF` | Card, modal            |
| `surface-soft` | `#F4ECEB` | Khối phụ               |
| `text`         | `#30282A` | Nội dung chính         |
| `text-muted`   | `#827579` | Mô tả, metadata        |
| `border`       | `#E9DFE0` | Viền                   |
| `success`      | `#39836A` | Thành công             |
| `warning`      | `#C58A3A` | Cảnh báo               |
| `danger`       | `#C34E58` | Lỗi, chặn, báo cáo     |

Đây là bộ màu khởi điểm; cần kiểm tra độ tương phản WCAG trước khi phát hành.

## 1.3. Typography

- Font giao diện: Inter, Manrope hoặc một sans-serif dễ đọc.
- Heading có thể dùng serif nhẹ cho một số khu vực cảm xúc, nhưng không dùng quá nhiều.
- Nội dung dài ưu tiên sans-serif, line-height khoảng 1.5–1.7.
- Không dùng font viết tay cho nội dung chức năng.

## 1.4. Nguyên tắc UX

1. Mỗi màn hình có một hành động chính rõ ràng.
2. Không ép người dùng bật VIP để xem thông tin thiết yếu về trạng thái quan hệ.
3. Phân biệt rõ `Like`, `Match`, `Couple Invitation` và `Couple Active`.
4. Mọi hành động nhạy cảm như kết thúc Couple, chặn, báo cáo đều cần xác nhận.
5. Không công khai thông tin quan hệ của người khác nếu không có căn cứ quyền truy cập.
6. Thiết kế mobile-first; desktop mở rộng không gian chứ không tạo ra trải nghiệm khác hoàn toàn.
7. Loading, empty, error, success và permission-denied đều phải có giao diện riêng.

---

# 2. Sitemap tổng thể

## 2.1. Website công khai

```text
/
├── /about
├── /how-it-works
├── /safety
├── /vip
├── /faq
├── /terms
├── /privacy
└── /contact
```

## 2.2. Khu vực xác thực

```text
/auth
├── /login
├── /register
├── /forgot-password
├── /reset-password
└── /verify-email
```

## 2.3. Khu vực người dùng sau đăng nhập

```text
/app
├── /onboarding
│   ├── /basic-info
│   ├── /photos
│   ├── /preferences
│   └── /verification
├── /discover
├── /likes
├── /matches
├── /matches/[matchId]
├── /chat
│   └── /[conversationId]
├── /couple
│   ├── /invitation
│   ├── /space
│   ├── /questions
│   ├── /challenges
│   ├── /memories
│   └── /settings
├── /notifications
├── /vip
├── /profile
│   ├── /edit
│   ├── /preview
│   └── /verification
├── /settings
│   ├── /account
│   ├── /privacy
│   ├── /notifications
│   ├── /blocked-users
│   └── /security
└── /help
```

## 2.4. Khu vực quản trị

```text
/admin
├── /dashboard
├── /users
│   └── /[userId]
├── /reports
├── /verifications
├── /subscriptions
├── /notifications
├── /content
└── /settings
```

---

# 3. Layout và điều hướng chung

## 3.1. Public layout

Dùng cho trang giới thiệu, cách hoạt động, an toàn, VIP và FAQ.

**Header desktop**

- Logo DATING bên trái.
- Menu: Cách hoạt động, An toàn, VIP, FAQ.
- Bên phải: Đăng nhập và nút Tạo tài khoản.
- Header sticky khi cuộn nếu phù hợp.

**Footer**

- Logo và mô tả ngắn.
- Liên kết sản phẩm.
- An toàn và hỗ trợ.
- Điều khoản, quyền riêng tư.
- Copyright.

## 3.2. Auth layout

- Logo ở phía trên.
- Form đặt trong card có chiều rộng giới hạn.
- Có thể dùng hình minh họa nhẹ ở desktop.
- Mobile chỉ giữ form, tránh chia cột gây chật.

## 3.3. App layout desktop

```text
┌───────────────────────────────────────────────────────────┐
│ Logo       Search / Page title           Notifications  Me │
├───────────────┬───────────────────────────────────────────┤
│ Sidebar       │ Main content                              │
│               │                                           │
│ Discover      │                                           │
│ Likes         │                                           │
│ Matches       │                                           │
│ Messages      │                                           │
│ Couple        │                                           │
│ VIP           │                                           │
│ Profile       │                                           │
│ Settings      │                                           │
└───────────────┴───────────────────────────────────────────┘
```

Sidebar:

- Khám phá
- Lượt thích
- Kết nối
- Tin nhắn
- Không gian Couple (chỉ khi có Couple Active; nếu chưa có thì hiển thị lời mời tìm hiểu tính năng)
- Thông báo
- VIP
- Hồ sơ
- Cài đặt

## 3.4. App layout mobile

- Header gọn, có tiêu đề trang và avatar/thông báo.
- Bottom navigation tối đa 5 mục: Khám phá, Kết nối, Tin nhắn, Couple, Hồ sơ.
- Các mục phụ nằm trong trang Hồ sơ hoặc menu.
- Couple tab có thể hiển thị trạng thái chưa có Couple.
- Không đặt CTA quan trọng sát vùng gesture của hệ điều hành.

---

# 4. Mô tả chi tiết từng trang

# 4.1. Trang chủ công khai — `/`

**Mục tiêu:** Giới thiệu giá trị DATING và đưa người xem đến đăng ký.

### Bố cục

1. Hero:
   - Headline gợi cảm xúc, ví dụ: “Một kết nối chân thành có thể bắt đầu từ hôm nay.”
   - Mô tả ngắn: nền tảng giúp mọi người gặp gỡ, tìm hiểu và vun đắp mối quan hệ.
   - CTA chính: “Bắt đầu kết nối”.
   - CTA phụ: “Tìm hiểu cách hoạt động”.
   - Ảnh minh họa hai người trò chuyện trong không gian ấm áp; không dùng ảnh quá sến.

2. Giá trị cốt lõi:
   - Kết nối có chủ đích.
   - Hồ sơ và xác minh người thật.
   - Không gian riêng cho hai người.
   - Quyền riêng tư và lựa chọn minh bạch.

3. Cách hoạt động:
   - Tạo hồ sơ.
   - Khám phá và gửi Like.
   - Hai người cùng quan tâm thì tạo Match.
   - Tìm hiểu và gửi lời mời trở thành Couple.
   - Cùng chăm sóc mối quan hệ.

4. Giới thiệu Couple Space:
   - Câu hỏi mỗi ngày.
   - Thử thách nhỏ.
   - Kỷ niệm chung.

5. Giới thiệu VIP:
   - Trình bày quyền lợi cụ thể.
   - Không dùng ngôn ngữ gây áp lực hoặc hù dọa.

6. Safety và FAQ teaser.
7. Footer.

### Trạng thái

- Người đã đăng nhập bấm CTA sẽ vào `/app/discover`.
- Người chưa đăng nhập vào `/auth/register`.

---

# 4.2. Đăng ký — `/auth/register`

**Mục tiêu:** Tạo tài khoản đơn giản và an toàn.

### Thành phần

- Email.
- Mật khẩu.
- Xác nhận mật khẩu nếu cần.
- Checkbox đồng ý Điều khoản và Chính sách quyền riêng tư.
- Nút Tạo tài khoản.
- Đăng nhập bằng Google/Apple nếu tích hợp.
- Link “Đã có tài khoản? Đăng nhập”.

### Validation

- Email hợp lệ.
- Mật khẩu đạt chính sách.
- Không cho đăng ký nếu chưa đồng ý điều khoản.
- Thông báo lỗi gần trường nhập tương ứng.
- Không tiết lộ tài khoản có tồn tại hay không theo cách tạo rủi ro dò tài khoản.

### Sau đăng ký

- Xác minh email.
- Chuyển vào onboarding.

---

# 4.3. Đăng nhập — `/auth/login`

### Thành phần

- Email.
- Mật khẩu.
- Hiện/ẩn mật khẩu.
- Ghi nhớ phiên đăng nhập nếu được hỗ trợ an toàn.
- Quên mật khẩu.
- Đăng nhập Google/Apple.
- Link đăng ký.

### Trạng thái

- Sai thông tin.
- Tài khoản chưa xác minh.
- Tài khoản bị khóa.
- Đăng nhập thành công.

---

# 4.4. Onboarding — `/app/onboarding/*`

**Mục tiêu:** Thu thập đủ dữ liệu để tạo hồ sơ có chất lượng, không khiến người dùng bỏ cuộc.

### Bước 1 — Thông tin cơ bản `/basic-info`

- Tên hiển thị.
- Ngày sinh.
- Giới tính (có tùy chọn phù hợp với chính sách sản phẩm).
- Khu vực sinh sống ở mức thành phố/tỉnh.
- Giới thiệu bản thân ngắn.

Không hiển thị ngày sinh đầy đủ cho người khác; chỉ hiển thị tuổi hoặc nhóm tuổi theo chính sách.

### Bước 2 — Ảnh `/photos`

- Ảnh đại diện.
- Thêm ảnh phụ.
- Kéo thả để sắp xếp.
- Xóa/thay ảnh.
- Hướng dẫn ảnh rõ mặt, không dùng ảnh giả mạo.

### Bước 3 — Sở thích tìm kiếm `/preferences`

- Độ tuổi mong muốn.
- Khoảng cách/khu vực nếu có.
- Giới tính muốn tìm hiểu.
- Mục tiêu kết nối.
- Các lựa chọn nhạy cảm phải tự nguyện và có giải thích.

### Bước 4 — Xác minh người thật `/verification`

- Giới thiệu ngắn về Face Liveness.
- Nêu rõ mục đích: kiểm tra có người thật đang thực hiện thao tác.
- Nêu rõ không mặc định đồng nghĩa xác minh danh tính pháp lý.
- CTA “Bắt đầu xác minh”.
- Hiển thị trạng thái: Chưa xác minh / Đang xử lý / Đã xác minh / Cần thử lại.

### Thanh tiến trình

Hiển thị 4 bước và cho phép quay lại bước trước. Có thể bỏ qua bước không bắt buộc, nhưng phải ghi rõ tính năng nào cần xác minh.

---

# 4.5. Khám phá — `/app/discover`

**Mục tiêu:** Xem hồ sơ và lựa chọn gửi Like hoặc bỏ qua.

### Desktop

- Khu vực trung tâm hiển thị profile card lớn.
- Ảnh chiếm phần lớn card.
- Tên hiển thị, tuổi, khu vực gần đúng, giới thiệu.
- Sở thích chung và mục tiêu kết nối.
- Nút: Bỏ qua, Like, xem hồ sơ đầy đủ.
- Có thể dùng phím tắt nhưng không được là cách duy nhất.

### Mobile

- Card chiếm gần toàn màn hình.
- Ảnh có thể vuốt.
- Nút Like và Bỏ qua lớn, dễ thao tác.
- Không dùng thao tác vuốt làm cơ chế duy nhất; phải có nút rõ ràng.

### Thành phần

- Bộ lọc tìm kiếm.
- Chỉ báo hồ sơ đã xác minh.
- Menu báo cáo/chặn.
- Loading skeleton.
- Empty state: “Chưa có hồ sơ phù hợp. Hãy thử thay đổi bộ lọc.”

### Quy tắc hiển thị

- Không hiển thị người đã bị block hoặc đã block người dùng.
- Không hiển thị hồ sơ không đáp ứng điều kiện tuổi/chính sách.
- Không tiết lộ dữ liệu vị trí chính xác.

---

# 4.6. Hồ sơ người dùng khác — `/app/discover/[userId]` hoặc modal

### Nội dung

- Ảnh và thông tin cơ bản.
- Giới thiệu.
- Sở thích.
- Mục tiêu kết nối.
- Trạng thái xác minh người thật.
- CTA Like.
- Menu báo cáo/chặn.

### Trạng thái đặc biệt

Nếu hồ sơ có Couple Active:

- Hiển thị thông tin cảnh báo cơ bản và dễ hiểu trước khi người xem gửi Like hoặc tiếp tục kết nối.
- Không yêu cầu người xem mua VIP để biết một thông tin có ảnh hưởng trực tiếp đến quyết định đồng ý kết nối.
- Không tự động công khai tên hoặc thông tin cá nhân của người Couple còn lại nếu không có quyền/consent phù hợp.

---

# 4.7. Lượt thích — `/app/likes`

**Mục tiêu:** Quản lý người đã Like mình và các tương tác đang chờ.

### Tabs

- Người đã thích bạn.
- Bạn đã thích.
- Đã bỏ qua (nếu sản phẩm quyết định cung cấp).

### Card

- Ảnh.
- Tên, tuổi, khu vực gần đúng.
- Thời điểm gửi Like.
- Nút Like lại / Bỏ qua / Xem hồ sơ.

### VIP

Nếu có quyền xem danh sách người đã Like, phải mô tả rõ giới hạn của gói Free và VIP. Không dùng ảnh làm mờ để che thông tin an toàn hoặc trạng thái quan hệ thiết yếu.

### Empty state

“Chưa có lượt thích mới. Hãy hoàn thiện hồ sơ để tăng cơ hội kết nối.”

---

# 4.8. Kết nối / Match — `/app/matches`

**Mục tiêu:** Quản lý các kết nối hai chiều.

### Thành phần

- Danh sách Match mới.
- Danh sách Match đang trò chuyện.
- Avatar, tên, thời gian Match gần nhất.
- Chỉ báo tin nhắn chưa đọc.
- CTA mở cuộc trò chuyện.

### Match mới

Có thể hiển thị một màn chúc mừng ngắn khi hai người cùng Like:

- “Hai bạn đã quan tâm đến nhau.”
- CTA “Bắt đầu trò chuyện”.

### Không được nhầm lẫn

Match không tự động có nghĩa là Couple. Chỉ khi có lời mời và cả hai đồng ý thì mới tạo Couple Active.

---

# 4.9. Chi tiết Match / cuộc trò chuyện — `/app/matches/[matchId]`

### Layout

- Header: avatar, tên, trạng thái Match.
- Khu vực tin nhắn.
- Input nhập tin.
- Gửi ảnh hoặc nội dung đa phương tiện nếu được hỗ trợ.
- Menu: xem hồ sơ, chặn, báo cáo, hủy Match.

### Trạng thái

- Chưa gửi tin.
- Đang gửi.
- Gửi thất bại và nút thử lại.
- Tin nhắn mới.
- Người kia đã hủy Match.
- Người dùng bị chặn.

### Lời mời Couple

Có thể có CTA “Mời trở thành Couple” nhưng cần:

- Giải thích Couple là trạng thái quan hệ trong nền tảng, không phải hôn nhân hay cam kết pháp lý.
- Chỉ gửi lời mời sau khi người dùng chủ động.
- Không tự động chuyển trạng thái khi chỉ một bên đồng ý.

---

# 4.10. Tin nhắn — `/app/chat` và `/app/chat/[conversationId]`

### Danh sách hội thoại

- Avatar, tên.
- Tin nhắn cuối.
- Thời gian.
- Badge chưa đọc.
- Trạng thái Match/Couple nếu phù hợp.

### Màn hình chat

- Header thông tin đối phương.
- Tin nhắn theo thời gian.
- Ngày phân cách.
- Ô nhập và nút gửi.
- Trạng thái gửi/đã gửi/thất bại.
- Menu an toàn.

### UX

- Cuộn đến tin mới nhất khi mở hội thoại.
- Phân trang tin nhắn cũ.
- Có trạng thái mất kết nối.
- Không tự động đánh dấu đã đọc nếu chưa có chính sách rõ ràng.

---

# 4.11. Lời mời Couple — `/app/couple/invitation`

**Mục tiêu:** Cho phép hai người xác nhận muốn thiết lập Couple trong ứng dụng.

### Khi có lời mời đến

- Tên và ảnh người gửi.
- Thời điểm gửi.
- Giải thích ngắn Couple Active có nghĩa gì trong nền tảng.
- Nút Đồng ý.
- Nút Từ chối.
- Link xem thêm điều khoản/trạng thái quyền riêng tư.

### Khi gửi lời mời

- Modal xác nhận.
- Nội dung: “Bạn muốn mời [tên] trở thành Couple trên DATING?”
- Nêu rõ người kia phải đồng ý.
- Có thể thiết lập thời hạn lời mời theo quyết định nghiệp vụ.

### Trạng thái

- Pending.
- Accepted.
- Declined.
- Expired.
- Cancelled.

Không cho phép tạo hai Couple Active chồng lấn với cùng một người nếu quy tắc sản phẩm không cho phép.

---

# 4.12. Không gian Couple — `/app/couple/space`

**Chỉ hiển thị nội dung đầy đủ khi người dùng có Couple Active.**

### Header

- Ảnh hai người.
- Tên hai người.
- Ngày bắt đầu Couple trên nền tảng (nếu cả hai đồng ý hiển thị).
- Menu cài đặt Couple.

### Dashboard

1. Câu hỏi hôm nay.
2. Thử thách hiện tại.
3. Kỷ niệm gần đây.
4. Tiến trình hoạt động chung.
5. Gợi ý hoạt động nhỏ.

### Empty state khi chưa có Couple

- Giải thích Couple Space.
- CTA quay lại Match/Discover.
- Không hiển thị dữ liệu của Couple khác.

---

# 4.13. Câu hỏi mỗi ngày — `/app/couple/questions`

### Thành phần

- Câu hỏi hôm nay.
- Mô tả vì sao câu hỏi có ích.
- Ô nhập câu trả lời riêng.
- Nút Lưu câu trả lời.
- Trạng thái câu trả lời của mình và đối phương theo cơ chế reveal đã thống nhất.

### Quy tắc UX

- Có thể chọn trả lời riêng trước khi xem câu trả lời của đối phương.
- Nếu thiết kế kiểu “cả hai trả lời xong mới mở”, phải thông báo rõ.
- Không ép người dùng chia sẻ câu trả lời nhạy cảm.
- Có thể bỏ qua câu hỏi.

---

# 4.14. Thử thách Couple — `/app/couple/challenges`

### Danh sách

- Tên thử thách.
- Mô tả.
- Thời lượng.
- Mức độ.
- Trạng thái: Chưa bắt đầu / Đang thực hiện / Hoàn thành.

### Chi tiết

- Mục tiêu.
- Các bước.
- Đánh dấu hoàn thành.
- Ghi chú hoặc ảnh kỷ niệm tùy quyền riêng tư.

---

# 4.15. Kỷ niệm — `/app/couple/memories`

### Thành phần

- Timeline kỷ niệm.
- Ảnh.
- Tiêu đề.
- Ngày tạo.
- Ghi chú.
- Nút thêm kỷ niệm.

### Thêm/sửa

- Upload ảnh.
- Nhập tiêu đề và nội dung.
- Chọn ngày.
- Quyền xem: mặc định chỉ hai thành viên Couple.
- Có xác nhận trước khi xóa.

---

# 4.16. Minh bạch trạng thái quan hệ / VIP — `/app/vip` và khu vực liên quan

**Đây là chức năng nhạy cảm, cần thiết kế đúng logic sản phẩm.**

### Nguyên tắc hiển thị

- Quyền nhận thông báo nâng cao được xét độc lập theo từng người nhận.
- Người tạo Match không bắt buộc phải VIP.
- Ví dụ: Hoa và Minh đang Couple; Minh Match Lan:
  - Hoa VIP: Hoa được nhận thông báo theo quyền lợi VIP.
  - Lan VIP: Lan được nhận thông báo theo quyền lợi VIP.
  - Cả Hoa và Lan VIP: cả hai được nhận thông báo.
  - Cả hai Free: không có thông báo nâng cao dành riêng cho VIP.
- Không được suy ra rằng người không nhận thông báo là không có sự kiện.
- Không biến quyền VIP thành cách che giấu một cảnh báo cơ bản cần thiết cho quyết định an toàn hoặc đồng thuận.

### UI khu vực VIP

- Gói hiện tại: Free/VIP.
- Quyền lợi từng gói.
- Giá và chu kỳ thanh toán.
- Nút nâng cấp.
- Trạng thái thanh toán.
- Hủy gia hạn.
- Lịch sử giao dịch.

### UI thông báo VIP

- Tiêu đề trung tính, không gây hoảng sợ.
- Mô tả sự kiện ở mức được phép.
- Thời gian.
- Link tới hướng dẫn quyền riêng tư.
- Không hiển thị dữ liệu riêng tư vượt quá consent và chính sách.

---

# 4.17. Thông báo — `/app/notifications`

### Tabs

- Tất cả.
- Kết nối.
- Tin nhắn.
- Couple.
- Hệ thống.

### Notification item

- Icon hoặc avatar.
- Nội dung ngắn.
- Thời gian.
- Trạng thái đã đọc/chưa đọc.
- Click điều hướng đến đúng đối tượng.

### Trạng thái

- Không có thông báo.
- Đang tải.
- Lỗi tải.
- Đánh dấu đã đọc.
- Cài đặt loại thông báo.

Không đưa nội dung nhạy cảm lên push notification mặc định nếu người dùng chưa cho phép xem trước trên màn hình khóa.

---

# 4.18. Hồ sơ của tôi — `/app/profile`

### Thành phần

- Ảnh đại diện.
- Tên hiển thị.
- Tuổi.
- Khu vực ở mức tổng quát.
- Giới thiệu.
- Sở thích.
- Trạng thái xác minh.
- Tỷ lệ hoàn thiện hồ sơ.
- Nút Chỉnh sửa hồ sơ.
- Nút Xem hồ sơ như người khác nhìn thấy.

### Chỉnh sửa — `/app/profile/edit`

- Chỉnh sửa thông tin cơ bản.
- Quản lý ảnh.
- Chỉnh sửa giới thiệu.
- Sở thích.
- Mục tiêu kết nối.
- Lưu thay đổi.
- Cảnh báo nếu rời trang khi có thay đổi chưa lưu.

---

# 4.19. Cài đặt — `/app/settings`

### Tài khoản

- Email.
- Đổi mật khẩu.
- Phiên đăng nhập.
- Xóa tài khoản.

### Quyền riêng tư

- Ai có thể tìm thấy hồ sơ.
- Hiển thị khu vực.
- Hiển thị trạng thái xác minh.
- Cho phép thông báo push.
- Quyền hiển thị thông tin Couple.

### Thông báo

- Tin nhắn.
- Match.
- Couple.
- Hoạt động hệ thống.
- Thông báo nâng cao theo gói.

### Người dùng bị chặn

- Danh sách tài khoản đã chặn.
- Bỏ chặn với xác nhận.

### Bảo mật

- Đăng xuất thiết bị khác.
- Quản lý phiên.
- Hướng dẫn bảo vệ tài khoản.

---

# 4.20. An toàn và hỗ trợ — `/safety`, `/app/help`

### Nội dung

- Nguyên tắc cộng đồng.
- Cách báo cáo.
- Cách chặn.
- Cách xử lý quấy rối.
- Cách xác minh người thật.
- Cách bảo vệ dữ liệu cá nhân.
- Kênh liên hệ hỗ trợ.

### Form báo cáo

- Lý do.
- Mô tả.
- Bằng chứng đính kèm nếu phù hợp.
- Xác nhận gửi.
- Không hiển thị cho người bị báo cáo biết danh tính người báo cáo, trừ trường hợp pháp lý bắt buộc.

---

# 5. Khu vực Admin

Admin phải có layout riêng, không dùng chung menu người dùng.

## 5.1. Dashboard — `/admin/dashboard`

- Tổng người dùng.
- Người dùng mới.
- Match mới.
- Couple Active.
- Tỷ lệ xác minh.
- Báo cáo đang chờ.
- Doanh thu thuê bao.
- Biểu đồ hoạt động theo ngày/tuần.

## 5.2. Quản lý người dùng — `/admin/users`

- Tìm theo ID/email/tên theo quyền được cấp.
- Bộ lọc trạng thái.
- Chi tiết tài khoản.
- Trạng thái xác minh.
- Trạng thái subscription.
- Lịch sử xử lý vi phạm.

Không cho admin xem nội dung riêng tư nếu không có quyền nghiệp vụ, căn cứ và audit log.

## 5.3. Báo cáo — `/admin/reports`

- Danh sách report.
- Loại vi phạm.
- Mức độ ưu tiên.
- Trạng thái xử lý.
- Người phụ trách.
- Lịch sử hành động.
- Ghi chú nội bộ.

## 5.4. Xác minh — `/admin/verifications`

- Trạng thái giao dịch xác minh.
- Kết quả nhà cung cấp.
- Lý do cần thử lại nếu có.
- Không lưu hoặc hiển thị dữ liệu sinh trắc học thô nếu không cần thiết.

## 5.5. Subscription — `/admin/subscriptions`

- Gói.
- Người đăng ký.
- Trạng thái thanh toán.
- Ngày bắt đầu/kết thúc.
- Lịch sử webhook và giao dịch.

---

# 6. Component UI dùng chung

Nên xây dựng design system và component dùng lại.

## 6.1. Base components

- `Button`
- `IconButton`
- `Input`
- `Textarea`
- `Select`
- `Checkbox`
- `RadioGroup`
- `Switch`
- `Avatar`
- `Badge`
- `Tooltip`
- `Dropdown`
- `Modal`
- `Drawer`
- `Tabs`
- `Skeleton`
- `Toast`
- `Pagination`
- `EmptyState`
- `ErrorState`
- `ConfirmDialog`

## 6.2. Business components

- `ProfileCard`
- `ProfileGallery`
- `ProfileCompletion`
- `LikeButton`
- `MatchCard`
- `ConversationListItem`
- `MessageBubble`
- `CoupleStatusCard`
- `CoupleInvitationCard`
- `CoupleMemberHeader`
- `DailyQuestionCard`
- `ChallengeCard`
- `MemoryCard`
- `NotificationItem`
- `SubscriptionPlanCard`
- `VerificationStatus`

## 6.3. Component behavior

- Mọi nút phải có hover, focus, active, disabled và loading.
- Form phải có validation và lỗi cụ thể.
- Modal phải đóng bằng nút rõ ràng; hỗ trợ Escape khi phù hợp.
- Focus phải được quản lý đúng khi mở modal/drawer.
- Không chỉ dùng màu để truyền đạt trạng thái; cần icon hoặc text đi kèm.

---

# 7. Responsive breakpoints

Có thể dùng breakpoint theo Tailwind:

| Thiết bị     | Kích thước tham khảo | Hành vi                                         |
| ------------ | -------------------: | ----------------------------------------------- |
| Mobile       |           dưới 640px | Một cột, bottom navigation                      |
| Tablet       |           640–1023px | Một hoặc hai cột tùy trang                      |
| Desktop      |       1024px trở lên | Sidebar + main content                          |
| Wide desktop |       1280px trở lên | Giới hạn max-width, không kéo nội dung quá rộng |

### Quy tắc

- Profile card trên mobile không bị cắt CTA.
- Chat dùng full-screen trên mobile.
- Sidebar desktop chuyển thành drawer trên tablet.
- Bảng admin có thể cuộn ngang hoặc chuyển thành card trên mobile.
- Không dùng hover làm cách duy nhất để truy cập chức năng.

---

# 8. Các trạng thái UI bắt buộc

Mỗi trang có dữ liệu bất đồng bộ cần thiết kế đủ:

1. Initial loading.
2. Skeleton loading.
3. Empty state.
4. Error state.
5. Success state.
6. Disabled state.
7. Permission denied.
8. Offline/retry.
9. Data stale hoặc cập nhật đồng thời.
10. Confirmation cho hành động không thể hoàn tác.

Ví dụ:

- Discover hết hồ sơ.
- Chưa có Match.
- Chưa có Couple.
- Lời mời Couple hết hạn.
- Couple đã kết thúc.
- VIP hết hạn.
- Xác minh thất bại.
- Gửi tin nhắn lỗi.
- Tài khoản bị giới hạn.

---

# 9. Luồng người dùng chính

## 9.1. Người dùng mới

```text
Trang chủ
  → Đăng ký
  → Xác minh email
  → Onboarding
  → Tạo hồ sơ
  → Thiết lập sở thích
  → Xác minh người thật (nếu áp dụng)
  → Khám phá
  → Like
  → Match
  → Chat
```

## 9.2. Từ Match đến Couple

```text
Match
  → Hai người trò chuyện
  → Một người gửi lời mời Couple
  → Người còn lại xem giải thích
  → Đồng ý / Từ chối
  → Nếu đồng ý: Couple Active
  → Mở Couple Space
```

## 9.3. Sự kiện Match khi đang Couple

```text
Hoa và Minh có Couple Active
Minh tạo Match với Lan
  → Backend ghi nhận sự kiện
  → Kiểm tra trạng thái Couple Active
  → Xác định người nhận có quyền nhận thông báo
  → Kiểm tra VIP riêng từng người nhận
  → Tạo notification đúng quyền
  → Gửi in-app/push theo cài đặt
```

**Lưu ý UI:** Không dùng màn hình VIP để thay thế các thông báo an toàn/cảnh báo cơ bản mà người dùng cần biết trước khi quyết định tiếp tục tương tác.

---

# 10. Quy tắc nội dung và microcopy

- Dùng tiếng Việt tự nhiên, thân thiện, không phán xét.
- Câu chữ ngắn, rõ hành động.
- Tránh dùng từ gây ghen tuông, kích động hoặc tạo cảm giác theo dõi.
- Không gọi Couple là “vợ/chồng” nếu người dùng chưa tự chọn cách xưng hô.
- Không gọi Match là “người yêu”.
- Phân biệt “đã xác minh người thật” với “đã xác minh danh tính”.
- Giải thích VIP theo quyền lợi cụ thể, không dùng thông điệp mơ hồ.

Ví dụ microcopy:

- Like: “Bạn muốn tìm hiểu người này?”
- Match: “Hai bạn đã quan tâm đến nhau.”
- Couple invitation: “Bạn muốn mời người này trở thành Couple trên DATING?”
- Couple active: “Hai bạn đã kết nối Couple.”
- Empty discover: “Chưa tìm thấy hồ sơ phù hợp. Bạn có thể thử điều chỉnh bộ lọc.”
- Empty couple: “Khi cả hai cùng đồng ý, không gian chung của hai bạn sẽ xuất hiện ở đây.”
- Verification: “Hãy làm theo hướng dẫn để xác nhận bạn là người thật đang thực hiện thao tác.”

---

# 11. Yêu cầu accessibility và chất lượng

- Tương phản màu đủ rõ.
- Có focus ring cho bàn phím.
- Label liên kết với input.
- Ảnh có alt text phù hợp.
- Không truyền đạt trạng thái chỉ bằng màu.
- Nút có vùng chạm đủ lớn trên mobile.
- Hỗ trợ giảm chuyển động nếu người dùng bật Reduce Motion.
- Form có thông báo lỗi dễ hiểu và không chỉ dựa vào toast.
- Các hành động quan trọng có thể thao tác bằng bàn phím.

---

# 12. Gợi ý triển khai bằng Next.js

## 12.1. Route groups

```text
src/
├── app/
│   ├── (marketing)/
│   │   ├── page.tsx
│   │   ├── about/page.tsx
│   │   ├── how-it-works/page.tsx
│   │   ├── safety/page.tsx
│   │   └── vip/page.tsx
│   ├── (auth)/
│   │   └── auth/
│   │       ├── login/page.tsx
│   │       └── register/page.tsx
│   ├── (app)/
│   │   └── app/
│   │       ├── layout.tsx
│   │       ├── discover/page.tsx
│   │       ├── likes/page.tsx
│   │       ├── matches/page.tsx
│   │       ├── chat/page.tsx
│   │       ├── couple/page.tsx
│   │       ├── notifications/page.tsx
│   │       ├── profile/page.tsx
│   │       └── settings/page.tsx
│   └── (admin)/
│       └── admin/
│           ├── layout.tsx
│           └── dashboard/page.tsx
├── components/
│   ├── ui/
│   ├── layout/
│   ├── profile/
│   ├── matching/
│   ├── chat/
│   ├── couple/
│   └── subscription/
├── features/
│   ├── auth/
│   ├── discover/
│   ├── matching/
│   ├── chat/
│   ├── couple/
│   ├── notifications/
│   └── subscription/
├── lib/
├── hooks/
├── stores/
└── types/
```

Đây là cấu trúc tham khảo. Có thể điều chỉnh theo kiến trúc feature-based đã thống nhất trong tài liệu hệ thống.

## 12.2. Nguyên tắc code UI

- Dùng TypeScript strict.
- Tách component theo trách nhiệm.
- Không đặt toàn bộ logic nghiệp vụ trong page component.
- Form dùng schema validation (ví dụ Zod).
- Server Component cho nội dung có thể render phía server.
- Client Component chỉ dùng khi cần state, event, browser API hoặc realtime.
- Kiểm tra quyền truy cập ở server/API, không chỉ ẩn nút ở frontend.
- Không để client tự quyết định VIP, Couple Active hoặc quyền xem dữ liệu.
- Tách loading/error UI theo route hoặc component.
- Dùng design tokens thay vì hard-code màu rải rác.

---

# 13. Danh sách màn hình ưu tiên thiết kế Figma

Không cần thiết kế tất cả màn hình cùng lúc. Nên làm theo thứ tự:

## Phase 1 — MVP

1. Landing page.
2. Register / Login.
3. Onboarding.
4. Discover.
5. Profile detail.
6. Likes.
7. Matches.
8. Chat.
9. Couple invitation.
10. Couple Space cơ bản.
11. Profile / Edit profile.
12. Settings.
13. VIP plan.
14. Notifications.

## Phase 2

1. Daily questions.
2. Challenges.
3. Memories.
4. Face Liveness flow hoàn chỉnh.
5. Safety center.
6. Admin dashboard.
7. Admin users / reports / verifications.

## Phase 3

1. Nâng cấp trải nghiệm mobile.
2. Các trạng thái nâng cao của Relationship Transparency.
3. AI Love Assistant.
4. Analytics và tối ưu chuyển đổi.

---

# 14. Checklist nghiệm thu UI

## Tổng thể

- [ ] Có design tokens và component library.
- [ ] Header/sidebar/bottom navigation nhất quán.
- [ ] Responsive trên mobile, tablet và desktop.
- [ ] Có loading, empty, error và success state.

## Tài khoản và hồ sơ

- [ ] Đăng ký/đăng nhập dễ hiểu.
- [ ] Onboarding có tiến trình.
- [ ] Người dùng chỉnh sửa và xem trước hồ sơ.
- [ ] Trạng thái xác minh được diễn đạt chính xác.

## Discover và Match

- [ ] Like và bỏ qua có phản hồi rõ.
- [ ] Không hiển thị hồ sơ bị block.
- [ ] Match không bị nhầm với Couple.
- [ ] Trạng thái Couple Active được trình bày minh bạch theo chính sách.

## Chat và Couple

- [ ] Chat có trạng thái gửi lỗi.
- [ ] Lời mời Couple cần xác nhận hai phía.
- [ ] Couple Space chỉ truy cập đúng thành viên.
- [ ] Có xác nhận trước khi kết thúc Couple hoặc xóa dữ liệu.

## VIP và quyền riêng tư

- [ ] Quyền VIP mô tả rõ ràng.
- [ ] Quyền nhận thông báo được xét riêng theo từng recipient.
- [ ] Không dùng VIP để che giấu cảnh báo cơ bản cần thiết.
- [ ] Không hiển thị thông tin riêng tư ngoài phạm vi cho phép.
- [ ] Có quản lý subscription và trạng thái thanh toán.

---

# 15. Các quyết định cần chốt trước khi thiết kế chi tiết

1. Thị trường phát hành đầu tiên: Việt Nam hay quốc tế?
2. Ngôn ngữ MVP: tiếng Việt, tiếng Anh hay song ngữ?
3. Có bắt buộc xác minh người thật trước khi Like/Chat không?
4. Người dùng Free được xem những thông tin nào trong danh sách Likes?
5. Chat mở ngay sau Match hay cần điều kiện khác?
6. Một người có được gửi nhiều lời mời Couple đang chờ không?
7. Khi Couple kết thúc, tin nhắn và kỷ niệm được xử lý ra sao?
8. Quy tắc thông báo Relationship Transparency cuối cùng là gì?
9. Thanh toán VIP qua cổng nào trên web?
10. Admin được phép xem dữ liệu nào và cần audit log ra sao?

---

# 16. Kết luận

Tài liệu này là bản đặc tả UI/UX ở cấp sản phẩm, dùng để:

- Làm cơ sở thiết kế Figma.
- Chia task frontend theo từng route và feature.
- Thống nhất hành vi giữa UI, backend và nghiệp vụ.
- Giữ trải nghiệm nhất quán khi phát triển web trước và mobile sau.

**Thứ tự khuyến nghị:** hoàn thiện sitemap và user flow → wireframe các màn MVP → chốt design system → thiết kế high-fidelity → triển khai component → tích hợp API → kiểm thử responsive và accessibility.

Tài liệu UI này cần được sử dụng cùng tài liệu `dating-system-blueprint.md`; nếu có khác biệt về quy tắc nghiệp vụ, tài liệu hệ thống và quyết định nghiệp vụ đã được chốt là nguồn ưu tiên.
