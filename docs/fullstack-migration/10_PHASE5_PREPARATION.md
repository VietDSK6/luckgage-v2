# 10 — Chuẩn bị Phase 5

Trạng thái ngày 2026-11-13: **chuẩn bị, chưa bắt đầu Phase 5**. Migration đã chạy trên database
local và `luckgage_integration`; 8/8 integration tests qua. Gate 4D/4E còn smoke test giao diện
admin/mobile trên thiết bị và trình duyệt. Không chuyển trạng thái Phase 5 trước khi ghi lại kết
quả gate này.

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

Android AVD `Pixel_7` và iOS Simulator `iPhone 17` có sẵn nhưng chưa boot tại thời điểm preflight.
Không có bằng chứng device smoke cho 4E trong repo.

Preflight local ngày 2026-11-13: API liveness trả 200, admin dev server chưa chạy; database
`luckgage` có 0 guide, 1 Trip Suggestion, 4 user và 3 trip. UI smoke phải tạo bài QA trong môi
trường phù hợp rồi dọn fixture sau khi ghi bằng chứng. Không dùng số lượng dữ liệu local này làm
bằng chứng cho performance hoặc nội dung Discover.

## 2. Thứ tự triển khai Phase 5 sau gate

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

Các quyết định này không chặn 5A–5B sau khi gate 4D/4E hoàn tất.
