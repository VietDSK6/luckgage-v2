# 08 — Quality, security và vận hành

## 1. Mục tiêu

Quality gate phải chứng minh đúng rủi ro của từng phần:

- Mobile: state, interaction, persistence/API mapping.
- Backend: permission, transaction, validation và auth.
- Admin: form/publish flow và role.
- End-to-end: admin content tới mobile, hai user dùng chung trip.

Không lấy số lượng test làm mục tiêu. Test phải bảo vệ invariant và failure path quan trọng.

## 2. Test pyramid theo bề mặt

### Expo mobile

#### Unit

- Calendar-date validation.
- Timeline grouping/sorting.
- Checklist progress/filter.
- DTO-to-domain mapping.
- Packing preview editing helpers.
- Error-code mapping.

#### Component

- Trips states.
- Create trip validation.
- Checklist quick-add/toggle/delete undo.
- Packing preview/apply state.
- Join invalid/expired/success.
- Weather unavailable không che trip content.

#### Device/e2e có chọn lọc

- Register/login.
- Create trip.
- Join bằng user thứ hai.
- Apply suggestion.
- Notification permission/schedule nếu nằm trong demo.

Không cần e2e cho mọi control nhỏ.

### Backend

#### Unit

- Rule engine.
- Permission policy.
- Validation.
- Token/session helper.

#### Integration với PostgreSQL

- Migration/constraint.
- Transaction create trip, join, apply.
- Cascade.
- Version conflict.
- Query/filter/pagination.

#### API/e2e

- Auth lifecycle.
- Role/member/owner matrix.
- Error contract.
- OpenAPI route coverage.
- External weather failure mapping.

### Admin

#### Component/integration

- Login/session expiry.
- Table filter/query URL.
- Rule form validation.
- Draft/preview/publish.
- Trip suggestion localization/preview.
- Suspend/reactivate.

#### E2E

- Admin publish rule.
- Mobile generate nhận version mới.

## 3. Test data strategy

- Factory cho user/trip/checklist.
- Mỗi integration test tự tạo dữ liệu cần thiết.
- Test database riêng.
- Reset theo transaction/schema giữa suite, không dùng database dev.
- Time được inject/fake cho expiry, timeline và reminder.
- Open-Meteo dùng fake server/adapter trong test; không gọi Internet.
- Demo seed tách khỏi test fixtures.

Không dùng cùng một admin/user hard-coded cho mọi test khiến suite phụ thuộc thứ tự.

## 4. CI gates

### Pull request

- Format/lint.
- Typecheck.
- Unit tests.
- Backend integration tests.
- Build mobile JS bundle hoặc Expo config validation.
- Build admin.
- OpenAPI validation/diff.
- Migration smoke trên database sạch.
- Secret scan nếu có.

### Main/demo release

- Tất cả PR gates.
- Backend e2e.
- Selected mobile/admin e2e.
- Production build smoke.
- Deploy staging.
- Health check.
- Manual demo path checklist.

Không yêu cầu full device suite ở mọi docs-only commit.

## 5. Security threat model tối thiểu

### Tài sản

- Password hash.
- Refresh session.
- User PII cơ bản.
- Trip/membership/checklist riêng tư.
- Join code.
- Admin content và quyền publish.
- Database credential/secret.

### Tác nhân/rủi ro

- User đọc/sửa trip không thuộc membership.
- Member thực hiện owner action.
- User giả role ADMIN ở client.
- Join code bị đoán hoặc lộ qua log.
- Refresh token bị lấy cắp/dùng lại.
- Password brute-force.
- Admin session bị CSRF/XSS.
- Input gây SQL injection hoặc stored content issue.
- Log/analytics lộ token/PII.
- Open-Meteo chậm kéo sập core API.

### Boundary

- Mobile device.
- Browser admin.
- Public API.
- Database.
- Third-party weather.
- Build/deployment system.

## 6. Security controls

### Password

- Không lưu plaintext hoặc reversible encryption.
- Ưu tiên Argon2id; benchmark cost trên host demo/production.
- Salt do thư viện chuẩn quản lý.
- Có giới hạn input hợp lý nhưng cho phép passphrase dài.
- Không tự viết hashing function.

### Session/token

- Access token ngắn hạn.
- Refresh token random mạnh, lưu hash server-side.
- Rotate khi refresh.
- Reuse token cũ dẫn tới revoke family/session theo policy.
- Mobile lưu refresh token trong SecureStore.
- Logout revoke server + clear local.
- Admin cookie Secure, HttpOnly, SameSite; bật CSRF protection theo topology.

### Authorization

- Guard xác thực chỉ là bước đầu.
- Service load membership và role cho mỗi use case.
- Owner action kiểm tra OWNER active.
- Admin role kiểm tra server-side.
- Resource ngoài quyền trả 403 hoặc 404 theo policy nhất quán.

### Input/output

- DTO schema validation.
- Whitelist enum.
- Length/range limit.
- ORM parameterization.
- Output encoding ở web.
- Không cho admin nhập script/SQL trong rule.
- Image URL được validate; không render raw HTML.

### Join code

- Entropy đủ, có expiry/maxUses/revoke.
- Hash trong database nếu flow lookup cho phép.
- Không đặt code trong URL.
- Không log raw request body ở join endpoint.
- Rate limit preview/join.

### Secrets

- Không commit env thật.
- Commit env.example chỉ chứa tên biến và giá trị giả.
- Mobile public API URL không phải secret.
- Database URL, token signing secret, cookie secret và deployment credential nằm trong secret
  storage của môi trường.
- Rotate secret nếu từng xuất hiện trong Git/log.

## 7. Privacy

- Admin chỉ xem dữ liệu cần cho quản trị.
- User email không trả trong members list nếu không cần.
- Không đưa note/checklist item vào analytics.
- Log chỉ dùng userId/tripId khi cần trace, tránh full payload.
- Không lưu Open-Meteo request có thông tin thừa.
- Nếu thêm xóa account, phải chốt retention/ownership trip trước khi code.

## 8. Logging và observability

### Structured log fields

- timestamp.
- level.
- requestId.
- route/method/status.
- durationMs.
- authenticated userId nếu phù hợp.
- errorCode.

Không log:

- Password.
- Access/refresh token.
- Cookie.
- Raw join code.
- Full request body auth/join.
- Full checklist note theo mặc định.

### Health

- /health/live: process còn sống.
- /health/ready: database kết nối và migration state phù hợp.
- Không bắt Open-Meteo phải sống để API core ready.

### Error reporting

- Client gửi/hiển thị requestId trong support state.
- Unexpected backend error trả generic detail.
- Stack trace chỉ ở server log, không ra production response.

## 9. External service resilience

Open-Meteo:

- Timeout.
- Limited retry chỉ cho safe GET.
- Cache.
- Map error thành unavailable.
- Không gọi trong database transaction.
- Weather route failure không làm trip/checklist route fail.

Image host:

- Placeholder/fallback.
- Không để broken image làm card mất chiều cao.

## 10. Performance budget hướng dẫn

Không đặt con số production giả khi chưa đo, nhưng phải đo các flow:

- Trips Hub initial render với dữ liệu demo lớn hợp lý.
- Checklist khoảng vài trăm item.
- Admin users pagination.
- Rule preview.
- API p95 cho local/staging.

Các quy tắc:

- Pagination ở server cho list lớn.
- Không N+1 query members/progress trong trip list.
- Index theo membership, trip/category position, status/publishedAt.
- Không trả checklist sâu trong trip list.
- Mobile list dùng virtualization và stable key.
- Ảnh có size/format phù hợp.

## 11. Accessibility quality gate

Mobile:

- Screen reader label.
- Focus order.
- Dynamic font.
- Contrast light/dark.
- 48 dp target.
- Reduce motion.

Admin:

- Keyboard-only flow.
- Focus visible.
- Form labels/errors.
- Dialog focus.
- Table headers.
- Status text.

Accessibility test phải nằm trong review checklist, không chỉ kiểm tra ở cuối.

## 12. Environment và config

### API

Tối thiểu:

- NODE_ENV.
- PORT.
- DATABASE_URL.
- ACCESS_TOKEN_SECRET hoặc signing key config.
- COOKIE/SESSION_SECRET nếu dùng.
- ALLOWED_ORIGINS.
- OPEN_METEO_BASE_URL.
- LOG_LEVEL.

### Mobile

- API_BASE_URL.
- Build environment name.
- Expo project/application identifiers.

Không đặt server secret trong mobile build; mọi giá trị đóng gói vào app đều có thể bị đọc.

### Admin

- API_BASE_URL/public origin.
- Environment label.

## 13. Database operations

- Backup trước migration destructive.
- Migration chạy một lần qua deploy job/command kiểm soát.
- App instance không tự chạy destructive reset.
- Demo có script reset riêng, chỉ chạy trên database được đánh dấu demo/local.
- Có seed idempotent hoặc reset flow rõ.
- Thử restore ít nhất một lần trước bảo vệ nếu phụ thuộc database hosted.

## 14. Deployment checklist

### Backend/database

- HTTPS.
- Database không public.
- Env/secrets set.
- Migration applied.
- Seed đúng môi trường.
- CORS/trusted origins.
- Health pass.
- Admin bootstrap account được đổi mật khẩu/credential an toàn.

### Admin

- API origin đúng.
- Session cookie hoạt động qua HTTPS.
- Refresh direct URL không 404.
- CSP/security headers nếu host hỗ trợ.
- No source map public chứa secret.

### Expo

- API URL demo.
- Development/release build, không chỉ Expo Go.
- Android/iOS permission text đúng.
- Notification icon/channel nếu demo.
- Deep link/auth restart smoke.
- Build artifact được lưu và thử cài.

Expo Build là dịch vụ build binary; tên dịch vụ/câu lệnh có thể đổi theo tài liệu Expo, nên quy
trình release phải tham chiếu docs chính thức tại thời điểm triển khai.

## 15. Demo recovery plan

- Có database demo seed sẵn.
- Có hai user và một admin đã kiểm tra.
- Có một trip có checklist và cache weather.
- Có join code được tạo ngay trước demo hoặc flow tạo code trực tiếp.
- Có video/screenshot dự phòng nhưng ưu tiên demo thật.
- Có API health URL.
- Biết cách restart API mà không reset DB.
- Không phụ thuộc mạng cho mọi bước; weather có cached/unavailable state.

## 16. Security/quality exit gate

- Không secret trong Git.
- Auth/join endpoints rate limited.
- Permission matrix test pass.
- Password hashing dùng library chuẩn.
- Refresh token revoke/rotation test pass.
- Admin cookie/token storage đúng policy.
- Transaction tests pass.
- Error/log review không lộ credential.
- Accessibility audit core screens pass.
- Backup/restore hoặc demo reset đã thử.
- Build deploy qua HTTPS và health pass.

## 17. Tài liệu tham chiếu

- [OWASP REST Security](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)
- [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP HTML5 Security](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)
- [NestJS authentication](https://docs.nestjs.com/security/authentication)
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [Expo Build](https://docs.expo.dev/build/)
