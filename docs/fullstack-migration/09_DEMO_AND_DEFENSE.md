# 09 — Kịch bản demo và bảo vệ

## 1. Câu chuyện cần kể

Không trình bày sản phẩm như một danh sách công nghệ. Câu chuyện:

> Một nhóm chuẩn bị chuyến đi, owner tạo trip và mời thành viên. Hệ thống dùng rule do admin quản
> lý để gợi ý hành lý, nhưng người dùng vẫn kiểm soát checklist. Hai người cùng cập nhật dữ liệu
> qua backend, còn weather chỉ hỗ trợ và không làm hỏng luồng chính.

Ba điểm chứng minh giá trị:

1. UI mobile mới nhanh và có cá tính.
2. Backend thật sự giữ auth, permission, transaction và shared state.
3. Admin thay đổi nội dung gợi ý mà không sửa app/database thủ công.

## 2. Demo end-to-end 8–10 phút

### Bước 1 — Admin publish rule

- Login admin.
- Mở packing rule draft “Mưa lớn”.
- Preview với rain chance mẫu.
- Publish version.

Nói:

- Rule deterministic.
- Admin không nhập code.
- Published revision có version.

### Bước 2 — User A tạo trip

- Login mobile.
- Trips Hub mới.
- Tạo trip Đà Nẵng.
- Chọn date/type/activities.
- Mở Trip command center.

Nói:

- Expo/React Native.
- Calendar date không đổi theo timezone.
- Backend transaction tạo trip và owner membership.

### Bước 3 — Smart List

- Generate preview.
- Chỉ ra reason badge do duration/weather/rule.
- Bỏ chọn hoặc sửa một item.
- Confirm apply.
- Mở checklist và thấy append.

Nói:

- Không phải AI.
- Preview không ghi database.
- Apply atomic và không ghi đè item cũ.

### Bước 4 — Join trip

- User A tạo join code.
- User B nhập code.
- Xem preview rồi confirm join.
- User B mở checklist.

Nói:

- Code có expiry/revoke.
- Server kiểm tra permission.
- Đây là shared state qua REST, chưa phải realtime.

### Bước 5 — Collaboration

- User B check/thêm một item.
- User A pull-to-refresh hoặc quay lại screen.
- Thấy thay đổi.

Nói:

- PostgreSQL là nguồn sự thật.
- Mobile không dual-write local + server.
- Nếu dùng version conflict, minh họa hoặc giải thích 409/refetch.

### Bước 6 — Failure resilience

- Dùng weather cached/unavailable state đã chuẩn bị.
- Trip/checklist vẫn hoạt động.

Nói:

- Open-Meteo là dependency ngoài.
- Weather failure được cô lập khỏi core flow.

### Bước 7 — Kết thúc

- Quay lại Trips Hub/readiness.
- Nếu checklist đạt 100%, cho xem success state.
- Admin dashboard cho thấy aggregate.

Nói:

- Checklist là nguồn sự thật.
- UI cho closure “Sẵn sàng lên đường”.

## 3. Demo rút gọn 5–7 phút

Nếu thời gian ít:

1. Mobile login + Trips Hub.
2. Mở trip có sẵn.
3. Generate/edit/apply Smart List.
4. User B join bằng code.
5. Shared checklist refresh.
6. Admin rule list/published version.

Không tạo user/trip từ đầu nếu bước đó làm mất thời gian; dữ liệu demo seed phải có sẵn.

## 4. Sơ đồ kiến trúc để trình bày

~~~text
Expo Mobile ───┐
               ├── REST/OpenAPI ── NestJS ── PostgreSQL
React Admin ───┘                       │
                                      └── Open-Meteo
~~~

Luồng request điển hình:

~~~text
Checklist Screen
  -> feature hook
  -> API client
  -> auth guard
  -> membership permission
  -> checklist service
  -> transaction/repository
  -> PostgreSQL
  -> response/error code
  -> query cache refresh
  -> UI
~~~

## 5. Những khác biệt phải nói rõ so với Compose

| Classroom Edition | Full-stack Edition |
|---|---|
| Android Compose | Expo React Native |
| Local Room source | PostgreSQL source sau tích hợp |
| Không account | User/admin auth |
| QR one-way copy | Join code + membership |
| Local hard-coded rules | Admin-managed deterministic rules |
| Không web | React admin |
| Material-based UI | Travel Tag 2.0 |
| Local-only checklist | Shared checklist qua REST |

Không nói “migrate” theo nghĩa công cụ tự chuyển Kotlin sang TypeScript. Đây là rewrite có kiểm
soát dựa trên baseline nghiệp vụ.

## 6. Câu hỏi vấn đáp dự kiến

### Vì sao chọn Expo/React Native?

Nhóm đã có nền React, cần cross-platform và tốc độ iteration UI. Expo cung cấp routing, build và
device APIs phù hợp. Những capability native như notification được kiểm thử bằng development
build, không giả định Expo Go đại diện release.

### Vì sao không dùng Firebase/Supabase?

Yêu cầu là backend tự xây. Nhóm muốn trực tiếp trình bày auth, REST, permission, transaction và
data model. Managed PostgreSQL/hosting vẫn chỉ là hạ tầng, business API do nhóm viết.

### Vì sao modular monolith?

Một team/đồ án nhỏ chưa có nhu cầu deploy/scaling độc lập. Monolith module hóa giữ transaction
đơn giản, dễ test và dễ bảo vệ hơn microservices.

### Vì sao PostgreSQL?

Trip, membership, invite, category và item có quan hệ/constraint rõ; join/apply cần transaction.

### Join có phải realtime không?

Không. Hai user dùng chung dữ liệu trên server. MVP refetch khi mutation, foreground hoặc
pull-to-refresh. WebSocket là phạm vi sau.

### Làm sao user không sửa trip người khác?

Mọi request protected xác thực user, sau đó service kiểm tra active membership và role. Client
ẩn button chỉ là UX, không phải bảo mật.

### Mã mời được bảo vệ thế nào?

Mã ngẫu nhiên, có expiry/maxUses/revoke, rate limit và không nằm trong URL/log. Database lưu hash
nếu lookup design cho phép.

### Smart List có phải AI không?

Không. Admin cấu hình các điều kiện hữu hạn; engine match deterministic, trả reason và rule
version. User preview/chỉnh/xác nhận trước khi append.

### Vì sao preview và apply là hai endpoint?

Preview là read-only và có thể chỉnh ở client. Apply nhận snapshot đã xác nhận, validate lại và
ghi atomic. Generate không được tự sửa checklist.

### Nếu apply lỗi giữa chừng?

Transaction rollback toàn bộ nên không có category được tạo nhưng item thiếu.

### Nếu hai người sửa cùng item?

Nếu bật versioning, client gửi version và server trả 409 khi stale để refetch. Nếu MVP dùng
last-write-wins, nhóm phải nói thẳng limitation và không tuyên bố đã giải conflict.

### Weather API chết thì sao?

Weather được map/cache riêng. Trip/checklist vẫn tải; UI hiển thị cached hoặc unavailable.

### Admin có đọc được checklist của mọi người không?

Không mặc định. Admin quản lý account status và content; trips page chỉ trả aggregate/support
metadata. Truy cập dữ liệu riêng tư cần permission/audit riêng.

### Token lưu ở đâu?

Mobile refresh credential ở SecureStore; access token ngắn hạn. Admin dùng secure HttpOnly cookie
theo thiết kế. Server lưu hash refresh credential và hỗ trợ revoke/rotation.

### Vì sao không giữ Room làm source song song?

Dual-write tạo conflict và khó giải thích. Sau integration, PostgreSQL là source of truth; local
storage chỉ là preference/cache nếu có yêu cầu.

## 7. Chia phần trình bày theo ownership

Phân công phải phản ánh Git history và công việc thật. Mẫu:

### Thành viên A — Mobile/UI

- Travel Tag 2.0.
- Expo Router.
- Trips/checklist/Smart List state.
- Accessibility.

### Thành viên B — Backend/data

- NestJS modules.
- PostgreSQL ERD/migration.
- Auth/permission/transaction.
- OpenAPI.

### Thành viên C — Integration/admin

- API client/token lifecycle.
- Join/collaboration.
- Admin publish flow.
- Deployment/test/demo.

Nếu tỷ lệ đóng góp không đều, không dùng bảng chia đều giả. Mỗi người phải trả lời được data flow
end-to-end của phần mình.

## 8. Bằng chứng cần chuẩn bị

- Repository commit/tag demo.
- OpenAPI UI/JSON.
- ERD.
- Test result theo mobile/backend/admin.
- Migration list.
- Screenshot light/dark và admin.
- Video ngắn dự phòng.
- URL API health và admin.
- APK/internal build đã cài thử.
- Database seed/recovery script.
- Decision log các scope cut.

## 9. Checklist rehearsal

### Trước buổi bảo vệ

- [ ] Cài build trên ít nhất hai thiết bị/emulator/user.
- [ ] Login sẵn admin và hai user hoặc biết credential demo.
- [ ] API/DB/admin health tốt.
- [ ] Tạo/publish rule test trước.
- [ ] Weather có cached/unavailable fallback.
- [ ] Join code flow đã thử trong ngày.
- [ ] Không có notification/email cá nhân hiện trên màn hình.
- [ ] Tắt auto-update gây rủi ro.
- [ ] Chuẩn bị mạng dự phòng nếu có.
- [ ] Có video/screenshot fallback.

### Ngay trước demo

- [ ] Reset đúng demo environment, không phải production.
- [ ] Chạy smoke path.
- [ ] Kiểm tra time/date của trip.
- [ ] Kiểm tra rule published.
- [ ] Kiểm tra admin session.
- [ ] Đóng dev overlay/log nhạy cảm.

## 10. Điều không nên nói

- “Ứng dụng dùng AI” khi chỉ có rule.
- “Realtime” khi cần refresh.
- “Mã QR là join” nếu QR chỉ copy snapshot.
- “An toàn tuyệt đối”.
- “Cross-platform hoàn chỉnh” nếu chỉ test Android.
- “Offline-first” nếu mutation cần server và chưa có outbox/conflict resolution.
- “Admin quản lý mọi thứ” khi permission thực tế hạn chế.

Mô tả chính xác limitation thường thuyết phục hơn phóng đại.

## 11. Cập nhật báo cáo

Báo cáo Classroom Edition hiện mô tả Compose/local-first. Không sửa báo cáo đó như thể v2 đã hoàn
thành. Khi các phase đạt gate:

1. Tạo báo cáo/section v2 riêng.
2. Thay sơ đồ bằng kiến trúc thực tế.
3. Ghi version dependency từ lockfile.
4. Ghi số test từ CI cuối.
5. Chụp UI mới.
6. Chỉ mô tả feature đã demo được.
