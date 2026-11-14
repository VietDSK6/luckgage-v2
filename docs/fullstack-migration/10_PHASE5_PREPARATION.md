# 10 — Triển khai Phase 5

Trạng thái ngày 2026-11-13: **Phase 5 đang triển khai local**. Theo chỉ đạo của người dùng,
smoke/QA giao diện 4D/4E do người dùng tự thực hiện; không chạy Playwright hay device QA trong
luồng triển khai này. Migration đã chạy trên database local và `luckgage_integration`; 8/8
integration tests qua. Bản release vẫn cần bằng chứng QA thủ công trước khi chốt gate cuối.

## 1. Khóa gate 4D/4E

Chạy trên API + PostgreSQL local, admin browser và ít nhất một Android emulator/thiết bị. Kiểm
tra thêm iOS nếu bản demo tuyên bố hỗ trợ iOS. Dùng tài khoản/dữ liệu demo, không dùng dữ liệu cá
nhân. Ghi kết quả, ảnh màn hình và lỗi vào tài liệu QA trước khi chuyển phase.

- [ ] Admin tạo draft Cẩm nang có section VI/EN, cover/alt, tag và Trip Suggestion liên quan;
  preview đúng hai ngôn ngữ, keyboard/focus hoạt động.
- [ ] Admin publish; mobile thấy bài trong Trips Hub, list và detail, kể cả khi đổi VI/EN.
- [ ] Mobile lưu bài, đăng xuất/đăng nhập lại và thấy bài trong danh sách đã lưu; bỏ lưu hoạt động.
- [ ] CTA bài mở Trip Suggestion và prefill **draft** tạo trip; không tự tạo trip.
- [ ] Archive suggestion làm CTA fallback tạo trip; archive bài ẩn public detail và saved list.
- [ ] Kiểm tra loading/empty/error, ảnh lỗi, font lớn, light/dark và màn hình hẹp; ghi lỗi cụ thể.
- [ ] Smoke Phase 4D: admin publish suggestion, mobile đọc và mở form prefill; trips support chỉ
  hiển thị aggregate.
- [ ] Owner tạo mã và cho user khác quét QR; user xem preview rồi mới xác nhận join. Kiểm tra QR
  sai, camera bị từ chối, mã hết hạn hoặc bị thu hồi và nhập mã thủ công vẫn hoạt động. Kiểm tra
  nút QR giữa bottom nav mở thẳng camera từ cả Trips và Settings.

Android AVD `Pixel_7` và iOS Simulator `iPhone 17` có sẵn nhưng chưa boot tại thời điểm preflight.
Không có bằng chứng device smoke cho 4E trong repo.

Preflight local ngày 2026-11-13: API liveness trả 200, admin dev server chưa chạy; database
`luckgage` có 0 guide, 1 Trip Suggestion, 4 user và 3 trip. UI smoke phải tạo bài QA trong môi
trường phù hợp rồi dọn fixture sau khi ghi bằng chứng. Không dùng số lượng dữ liệu local này làm
bằng chứng cho performance hoặc nội dung Discover.

## 2. Thứ tự triển khai Phase 5

### 5A — Security, accessibility và resilience

- Audit auth/session, role/membership, CSRF/CORS, rate limit, response/log, secrets và security
  headers theo [quality/security checklist](08_QUALITY_SECURITY_OPERATIONS.md). Sửa lỗi có bằng
  chứng; thêm test cho invariant bị lỗi.
- Audit mobile core flow và admin bằng bàn phím/screen reader: focus, nhãn, thông báo lỗi, cỡ
  chữ động, touch target, contrast light/dark và reduce motion.
- Hoàn thiện ảnh fallback, loading/empty/retry/offline state; weather failure vẫn không chặn trip
  hoặc checklist. Kiểm tra các màn hình mới của 4E cùng các core screen.

**Gate 5A:** không còn lỗi bảo mật/accessibility nghiêm trọng trong core flow; test và ảnh QA ghi
nhận kết quả.

### 5B — Performance và database operations

- Đo Trips Hub với dữ liệu demo lớn hợp lý, checklist vài trăm item, admin user pagination, rule
  preview và API p95 local/staging. Chỉ tối ưu điểm nghẽn đo được.
- Tạo backup/restore procedure cho database demo hoặc isolated test; thử restore vào database
  riêng và xác minh migration/health. Không reset database local có dữ liệu người dùng.
- Mở rộng demo seed idempotent cho hai user, một trip có checklist, rule, suggestion và ít nhất một
  Cẩm nang thật để rehearsal. Không tạo 12–20 bài giả chỉ để mở Discover.

**Gate 5B:** có số đo trước/sau khi tối ưu, restore thử thành công và seed chạy lặp không tạo
trùng dữ liệu.

### 5C — CI, build và staging

- Thêm CI cho lint/typecheck, unit/integration, OpenAPI check, migration smoke, admin build và
  Expo JS bundle. Repo hiện chưa có `.github/workflows`.
- Chốt application IDs và cấu hình build; tạo/cài thử Expo development và release build trên
  thiết bị mục tiêu. Repo hiện chưa có `eas.json`.
- Chốt nơi chạy API/admin/PostgreSQL và origin HTTPS. Chuẩn bị deploy config, secret storage,
  migration job, CORS/cookie topology, SPA direct-route fallback và health checks. Repo hiện chưa
  có Dockerfile/deploy config.

**Gate 5C:** CI xanh, binary đã cài thử, staging HTTPS có readiness pass; admin login và mobile API
flow hoạt động với origin thực.

### 5D — Rehearsal và gói bàn giao

- Diễn tập kịch bản admin → mobile → hai user → Smart List → weather unavailable theo
  [demo script](09_DEMO_AND_DEFENSE.md), rồi bổ sung đoạn Cẩm nang → Trip Suggestion.
- Chuẩn bị bằng chứng: commit/tag, OpenAPI, migration list, test result, screenshot light/dark,
  build artifact, health URL, backup/restore record và video dự phòng.
- Cập nhật báo cáo, ERD, sơ đồ và giới hạn sản phẩm từ code chạy thật.

**Gate 5D:** một lần diễn tập đầy đủ trên môi trường demo thành công, có recovery path và bộ bằng
chứng khớp implementation.

## 3. Quyết định cần có trước 5C

- Hosting/API/admin/database và domain HTTPS của môi trường demo.
- Tài khoản Expo/build, application IDs Android/iOS và thiết bị mục tiêu.
- Nơi lưu secret, backup và artifact; người có quyền deploy.

Các quyết định này không chặn công việc local 5A–5B. QA giao diện vẫn là gate của bản release.

Quyết định ban đầu là **local trước**; quyết định VPS dùng chung ngày 2026-11-14 bên dưới thay thế
phần hosting. HTTPS và CORS preflight đã kiểm tra trên origin thật; đăng nhập/cookie còn chờ tài khoản
admin.

Quyết định ngày 2026-11-14: người dùng chọn VPS dùng chung với Mini PaaS và PostgreSQL trên cùng
máy cho bản demo. Cấu hình triển khai độc lập nằm ở [deploy/vps](../../deploy/vps/README.md).
Hai hostname `luckgage-api.ai2p.id.vn` và `luckgage-admin.ai2p.id.vn` đã có route riêng trong
Cloudflare Tunnel và HTTPS health trả 200. Tài khoản admin ban đầu đã được tạo; đăng nhập,
cookie và CSRF qua HTTPS đã kiểm tra. Mobile binary vẫn chưa được build với API public.

## 4. Bằng chứng triển khai local

- QR tham gia chuyến đi dùng chính join code đã có: owner thấy QR sau khi tạo mã, mobile quét bằng
  camera và gọi preview trước xác nhận. Camera chỉ xin quyền khi chọn quét; nhập mã vẫn hoạt động.
  Typecheck, lint, test parser QR và Android JS export đã qua; device QA thuộc người dùng.
- 5A: ảnh mạng trên mobile và admin guide/suggestion có fallback alt text thay cho khung trống;
  production hoặc remote demo seed cần `ALLOW_DEMO_SEED=true` rõ ràng. QA visual/accessibility do
  người dùng giữ.
- 5B: demo seed tạo một guide VI/EN liên kết suggestion, hai user và trip có checklist. Chạy hai
  lần trên `luckgage_integration` cho cùng số lượng 3 user, 1 trip, 1 guide, 3 item. Script
  `scripts/verify-demo-backup.sh luckgage_integration` đã dump, restore và đối chiếu 3 user,
  1 trip, 1 guide, 5 migration; database restore tạm đã được dọn. Script từ chối database `luckgage`.
- Database local `luckgage` đã seed ngày 2026-11-13: 1 guide published, 1 trip demo và 3 checklist
  item của trip demo. Seed làm mới phiên của tài khoản demo chung; admin hiện có được giữ nguyên.
- Baseline API local ngày 2026-11-13, 20 request/route: p95 trips list 15,9 ms, guides list
  5,8 ms, suggestions list 7,7 ms, checklist 11,7 ms. Dataset local nhỏ, chưa đại diện staging
  hay vài trăm checklist item. Một lượt riêng trên database tạm có **303 checklist item** cho
  p95 trips list 18,5 ms, guides list 11,5 ms, suggestions list 11,1 ms và checklist 16,1 ms
  (20 request tuần tự/route, API local port 3100). Database và API tạm đã được dọn. Đây là
  latency HTTP local không có tải đồng thời; vẫn cần số đo staging trước release.
- 5C: `.github/workflows/ci.yml` chạy PostgreSQL `_integration`, typecheck, lint, unit/integration
  tests, seed hai lần, OpenAPI, API/admin build và Expo Android JS export. Workflow chưa được xác minh trên
  GitHub Actions runner; deployment và binary release chưa cấu hình. Cả 5 migration đã áp thành
  công từ database tạm sạch `luckgage_phase5_integration`, sau đó database tạm đã được dọn.
- Local code checks: 14 admin, 27 API, 57 mobile tests và 8 integration tests qua; Expo Android
  JS export, typecheck, lint, OpenAPI check và admin build qua. Đây là code/build checks, không thay
  thế QA giao diện.
- Security review local và các giới hạn staging: [11 — Security audit local](11_LOCAL_SECURITY_AUDIT.md).
- VPS preflight ngày 2026-11-14: còn khoảng 2,6 GiB RAM khả dụng và 30 GB đĩa trống; cổng 8091,
  8092 trống. Đã đưa snapshot nguồn hiện tại (bao gồm thay đổi UI chưa commit) lên thư mục
  `/home/user/services/luckgage`, image tag `20261114-01-snapshot`, secret tạo trực tiếp trên VPS.
  Compose project `luckgage-demo` tách khỏi Mini PaaS, chỉ bind loopback. PostgreSQL 17, migrate,
  API và admin đều healthy; readiness API và `/health` admin trả 200. Đây là **internal staging**;
  chưa công bố HTTPS. Dữ liệu VPS mới tạo chưa có admin hoặc demo seed.
- Backup đầu tiên tại `backups/20261114-091148/luckgage.dump` trên VPS; restore thử vào database
  riêng xác nhận đủ 5 migration, database thử đã dọn. Sau deploy còn khoảng 2,5 GiB RAM khả dụng,
  29 GB đĩa trống; container API ~111 MiB, PostgreSQL ~31 MiB, admin ~3 MiB. Mini PaaS vẫn healthy
  và endpoint public trả 200; `make smoke` của Mini PaaS đạt 9/9. Cần sao lưu **ngoài VPS** trước
  khi lưu dữ liệu khó tái tạo.
- Cloudflare Tunnel route bản 5 đặt API và admin trước `*.ai2p.id.vn`. Kiểm tra từ máy ngoài VPS:
  API `/api/v1/health/ready` trả 200 với database/migration `up`; admin `/health` và `/login`
  trả 200; CORS preflight từ admin origin trả 204, `Access-Control-Allow-Origin` đúng hostname và
  `Access-Control-Allow-Credentials: true`. Đây là bằng chứng HTTPS và SPA fallback, chưa thay thế
  đăng nhập admin thật hoặc mobile flow.
- Tạo admin `vietm1a4@gmail.com` trên database VPS bằng script bootstrap riêng; mật khẩu ngẫu nhiên
  chỉ lưu trong `secrets/admin-password` quyền 0600 ngoài Git, chờ người dùng nhận qua SSH. Thử
  HTTP trên origin HTTPS thật: login 200 với quyền ADMIN, hai cookie có `Secure`, `SameSite=Strict`
  và path admin; `me` trả 200; logout có CSRF trả 204; session cũ trả 401. Phiên dùng thử đã thu hồi.
  Backup sau bootstrap tại `backups/20261114-092753/luckgage.dump` đã restore vào database riêng,
  xác nhận admin ACTIVE rồi dọn database thử. Lượt thử đầu bằng Python urllib bị Cloudflare chặn
  `error 1010` theo user agent; thử lại với header trình duyệt đã đạt. Chưa chạy browser UI QA.
