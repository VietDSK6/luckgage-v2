# Đặc tả luckgage — Full-stack Edition

**Trạng thái:** Draft làm nguồn sự thật cho phiên bản v2

**Phiên bản tài liệu:** 0.1

**Ngày cập nhật:** 2026-11-05

**Phạm vi:** Expo mobile, backend tự xây và web quản trị

Tài liệu này mô tả phiên bản v2 của luckgage. Tài liệu
[PROJECT_SPEC_CLASSROOM_EDITION.md](PROJECT_SPEC_CLASSROOM_EDITION.md) tiếp tục mô tả bản
Android/Compose hiện tại và không bị thay thế hồi tố.

## 1. Tầm nhìn

luckgage giúp một cá nhân hoặc một nhóm nhỏ biến thông tin chuyến đi thành một checklist hành
lý rõ ràng, cùng chuẩn bị và biết chính xác còn thiếu gì trước ngày khởi hành.

Phiên bản v2 có ba bề mặt:

- Ứng dụng Expo cho người đi du lịch.
- REST API và cơ sở dữ liệu máy chủ do nhóm tự xây.
- Web quản trị để quản lý người dùng và nội dung gợi ý.

Ứng dụng mới không sao chép giao diện Compose. Bản Compose là baseline nghiệp vụ và kiểm thử;
v2 được thiết kế lại theo ngôn ngữ “Travel Tag” giàu cá tính hơn.

## 2. Quyết định nền tảng

| ID | Quyết định |
|---|---|
| D-001 | Mobile dùng React Native với Expo và TypeScript. |
| D-002 | Backend là modular monolith viết bằng TypeScript; không dùng microservice trong MVP. |
| D-003 | Giao tiếp client–server dùng REST và có OpenAPI làm hợp đồng. |
| D-004 | Dữ liệu cộng tác sau tích hợp lấy backend/PostgreSQL làm nguồn sự thật. |
| D-005 | MVP đồng bộ bằng request/refresh; chưa có WebSocket hoặc realtime presence. |
| D-006 | Web quản trị là ứng dụng React riêng và chỉ gọi cùng REST API. |
| D-007 | Gợi ý hành lý là deterministic rule engine, không được giới thiệu là AI. |
| D-008 | Smart List luôn preview, cho chỉnh sửa và yêu cầu xác nhận trước khi append. |
| D-009 | Thời tiết là dữ liệu bổ trợ; lỗi thời tiết không chặn trip/checklist. |
| D-010 | Bản cài Compose hiện có không cần tự động chuyển dữ liệu người dùng sang v2 trong MVP. |

## 3. Người dùng và vai trò

### 3.1. Guest

- Xem onboarding.
- Đăng ký hoặc đăng nhập.
- Chưa được đọc dữ liệu trip riêng tư.

### 3.2. User

- Quản lý hồ sơ cá nhân.
- Tạo trip.
- Tạo mã mời và tham gia trip bằng mã.
- Quản lý checklist của trip mà mình là thành viên.
- Xem và áp dụng gợi ý hành lý.
- Xem gợi ý chuyến đi đã được admin xuất bản.

### 3.3. Trip owner

Trip owner có toàn bộ quyền của user và thêm:

- Sửa/xóa trip.
- Tạo hoặc thu hồi mã mời.
- Xem và loại thành viên khỏi trip.
- Không được chuyển quyền owner trong MVP.

### 3.4. Admin

- Truy cập web quản trị.
- Xem, tìm kiếm, khóa/mở khóa tài khoản.
- Quản lý trip suggestions.
- Quản lý packing rules và packing items.
- Xem thống kê tổng hợp.
- Không xem mật khẩu, refresh token hoặc secret.

## 4. Thuật ngữ chuẩn

| Thuật ngữ | Định nghĩa |
|---|---|
| Trip suggestion | Nội dung địa điểm/ý tưởng chuyến đi do admin biên soạn và xuất bản. |
| Packing suggestion | Vật dụng được rule engine đề xuất từ thông tin trip, hoạt động và thời tiết. |
| Checklist | Danh sách chuẩn mà người dùng thực sự dùng để chuẩn bị hành lý. |
| Preview | Bản nháp gợi ý chưa được ghi vào checklist. |
| Apply | Thao tác có xác nhận, append các item được chọn từ preview vào checklist. |
| Join code | Mã mời có thời hạn để một user trở thành thành viên của trip. |
| Sync | Đọc/ghi trạng thái dùng chung qua API; không đồng nghĩa realtime trong MVP. |

Không tạo entity “luggage” riêng chỉ để đổi tên checklist. Checklist category và checklist item
đã biểu diễn hành lý; thêm entity trùng nghĩa sẽ tạo hai nguồn sự thật.

## 5. Phạm vi chức năng

### 5.1. Tài khoản

- Đăng ký bằng email, mật khẩu và tên hiển thị.
- Đăng nhập, refresh phiên và đăng xuất.
- User bị khóa không thể đăng nhập hoặc gọi API được bảo vệ.
- Mobile lưu credential nhạy cảm trong secure storage.
- Admin web dùng phiên bảo mật do server quản lý; không lưu secret dài hạn trong localStorage.

### 5.2. Trip

- Liệt kê trip sắp tới, đang diễn ra và đã qua.
- Tạo, xem, sửa, xóa trip.
- Thông tin gồm tên, điểm đến, ngày, loại trip, ghi chú và dữ liệu địa điểm.
- Ngày bắt đầu/kết thúc là calendar date theo định dạng YYYY-MM-DD, không tự đổi theo timezone.
- Trip detail hiển thị readiness, thời tiết, thành viên và hành động chính.

### 5.3. Join trip

- Owner tạo join code có hạn sử dụng.
- User nhập code và xem preview tối thiểu: tên trip, điểm đến, ngày và owner.
- Sau xác nhận, backend thêm membership trong transaction.
- Join cùng một trip nhiều lần không tạo membership trùng.
- Owner có thể thu hồi code.
- MVP không có link mời, email invite, chat, presence hoặc con trỏ realtime.

### 5.4. Checklist

- Trip có nhiều category; category có nhiều item.
- CRUD category và item.
- Item có tên, số lượng, ghi chú, trạng thái packed và thứ tự.
- Tìm kiếm, lọc packed/unpacked và thao tác cả category.
- Checklist là nguồn sự thật; mọi suggestion chỉ là đầu vào tùy chọn.
- Xóa trip phải xóa membership, invite, checklist và weather cache liên quan.

### 5.5. Packing suggestions

- Rule engine xét loại trip, số ngày, hoạt động, ghi chú và thời tiết nếu có.
- Admin quản lý rule ở trạng thái draft, published hoặc archived.
- Rule đã published phải có version để có thể truy vết preview được tạo từ nội dung nào.
- Preview giải thích ngắn gọn vì sao item được gợi ý.
- User có thể bỏ chọn, đổi tên, đổi số lượng, ghi chú hoặc category.
- Apply chạy trong transaction và chỉ append item đã chọn.
- Không silently overwrite category/item hiện có.
- Lỗi rule hoặc weather không ngăn người dùng chỉnh checklist thủ công.

### 5.6. Trip suggestions

- Admin tạo nội dung gợi ý điểm đến/chuyến đi bằng tiếng Việt và tiếng Anh.
- Nội dung có title, summary, destination, image, tags và trạng thái xuất bản.
- User chỉ thấy nội dung published.
- Chọn một suggestion có thể prefill form tạo trip; không tự tạo trip.
- Cá nhân hóa bằng thuật toán hoặc AI nằm ngoài MVP.

### 5.7. Thời tiết và địa điểm

- Tìm địa điểm và lấy forecast qua Open-Meteo.
- Sau giai đoạn tích hợp, backend đứng giữa mobile và Open-Meteo để thống nhất mapping/cache.
- Có cache với thời điểm tải; UI phải phân biệt fresh, cached và unavailable.
- Weather failure không được rollback thao tác trip/checklist.

### 5.8. Nhắc chuẩn bị

- Mobile hỗ trợ local reminder trước ngày đi.
- Push notification cho thay đổi cộng tác là giai đoạn sau, không phải điều kiện hoàn thành MVP.
- Người dùng phải chủ động cấp quyền; từ chối quyền không chặn chức năng khác.

### 5.9. Settings

- Theme sáng, tối hoặc theo hệ thống.
- Tiếng Việt hoặc tiếng Anh.
- Đơn vị °C hoặc °F.
- Đăng xuất.
- Xóa tài khoản không nằm trong MVP nếu chưa chốt chính sách giữ/xóa dữ liệu.

### 5.10. Admin web

- Dashboard tổng hợp.
- User management.
- Packing rule management kèm công cụ preview rule với input mẫu.
- Trip suggestion management.
- Trip list chỉ phục vụ hỗ trợ/thống kê; không mặc định hiển thị nội dung checklist riêng tư.

## 6. Luồng cốt lõi

### 6.1. Người dùng mới

~~~text
Onboarding
  -> Register/Login
  -> Create trip hoặc Join trip
  -> Thành công
  -> Trips Hub
~~~

Cờ hoàn tất onboarding chỉ được lưu sau khi create hoặc join thành công.

### 6.2. Chuẩn bị hành lý

~~~text
Trip Detail
  -> Build packing suggestions
  -> Preview + giải thích
  -> Chỉnh/chọn item
  -> Confirm apply
  -> Checklist được append
~~~

### 6.3. Cộng tác

~~~text
Owner tạo join code
  -> Member nhập code và xác nhận
  -> Server tạo membership
  -> Member đọc/ghi cùng checklist qua REST API
~~~

### 6.4. Quản trị nội dung

~~~text
Admin tạo rule ở Draft
  -> Preview bằng trip mẫu
  -> Publish version mới
  -> Mobile dùng rule published ở lần generate tiếp theo
~~~

## 7. Product invariants

1. Checklist luôn là nguồn sự thật.
2. Suggestion không tự ghi dữ liệu.
3. Apply suggestion phải có preview và xác nhận.
4. Apply chỉ append; không ghi đè âm thầm.
5. Rule engine deterministic và giải thích được.
6. Weather không chặn trip/checklist.
7. Mọi API trip/checklist đều kiểm tra membership phía server.
8. Quyền admin không được tin từ payload phía client.
9. Join code có hạn dùng và có thể thu hồi.
10. Không commit API key, token, password hoặc secret.
11. UI không dùng màu sắc làm tín hiệu trạng thái duy nhất.
12. Mọi icon-only action có accessible label.

## 8. Yêu cầu phi chức năng

### Bảo mật

- Mật khẩu được hash bằng thuật toán password hashing phù hợp; không mã hóa hai chiều hoặc lưu
  plaintext.
- Access token ngắn hạn; refresh credential có thể thu hồi.
- Rate limit endpoint đăng nhập, refresh và join.
- Validate input tại API boundary.
- Log không chứa mật khẩu, token hoặc full join code.
- CORS chỉ cho phép origin đã cấu hình.

### Tin cậy dữ liệu

- Tạo trip + owner membership chạy trong một transaction.
- Join trip chạy trong một transaction.
- Apply Smart List chạy trong một transaction.
- Các quan hệ có foreign key và index cho truy vấn chính.
- Migration database được version-control và review.

### UX và accessibility

- Touch target tối thiểu 48 x 48 dp.
- Hỗ trợ dynamic text ở mức thực tế và không cắt nội dung quan trọng.
- Có empty, loading, retry, offline và success state.
- Hỗ trợ reduce motion.
- Tương phản màu phải được audit trước khi chốt token.

### Hiệu năng

- Không tải toàn bộ user/trip trên admin; mọi danh sách lớn có pagination.
- Mobile không block render bằng request không cần thiết.
- Ảnh suggestion có kích thước và fallback rõ ràng.
- API response list chỉ trả field cần thiết; detail endpoint trả dữ liệu sâu hơn.

### Quan sát và hỗ trợ

- Mỗi request có request ID.
- API trả error code ổn định cho client mapping.
- Có health endpoint cho demo/deploy.
- Production log không lộ PII không cần thiết.

## 9. Ngoài phạm vi MVP

- Booking vé, khách sạn hoặc thanh toán.
- Chat trong trip.
- Realtime presence/WebSocket.
- Chỉnh sửa offline rồi tự hòa giải xung đột phức tạp.
- Đăng nhập social, MFA, email verification và forgot-password hoàn chỉnh.
- AI/LLM suggestions.
- Chuyển owner hoặc nhiều owner.
- File export.
- Public social feed.
- Cổng quản trị đa tenant.

Những mục trên chỉ được đưa vào khi giảng viên yêu cầu hoặc MVP đã đạt toàn bộ quality gate.

## 10. Tiêu chí hoàn thành v2

- Mobile Expo có UI mới và hoàn thành create/join trip, checklist và Smart List.
- Backend tự xây có auth, RBAC, trip membership, checklist, suggestions và OpenAPI.
- PostgreSQL migration/seed chạy lặp lại được.
- Mobile tích hợp API; backend là nguồn sự thật cho dữ liệu cộng tác.
- Web admin quản lý user, trip suggestions và packing rules.
- Luồng demo end-to-end chạy được với hai user và một admin.
- Các thao tác transaction quan trọng có integration test.
- Không có secret trong Git.
- Tài liệu kiến trúc, API, data model, test và demo khớp với code cuối.

## 11. Giả định cần xác nhận với giảng viên

Tài liệu dùng các mặc định sau cho đến khi có câu trả lời khác:

- “Trip suggestion” là nội dung chuyến đi do admin biên soạn, không phải AI.
- Web quản trị cần auth và role admin.
- Backend phải do nhóm viết; dịch vụ hosting/managed PostgreSQL vẫn được phép.
- Chỉ cần chứng minh shared state qua REST; realtime không bắt buộc.
- Không bắt buộc migrate dữ liệu từ APK Compose đang cài.
- Không bắt buộc phát hành App Store; Android development/release build đủ cho bảo vệ.

Nếu một giả định thay đổi, cập nhật tài liệu này trước rồi mới thay đổi code.
