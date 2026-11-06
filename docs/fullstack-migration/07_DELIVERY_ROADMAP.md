# 07 — Roadmap và quality gates

## 1. Nguyên tắc

Thứ tự theo yêu cầu dự án:

~~~text
Expo mobile local
  -> Backend độc lập
  -> Tích hợp mobile/backend
  -> Admin web
  -> Hardening và bảo vệ
~~~

Mỗi phase kết thúc bằng một demo chạy được. Không triển khai nhiều phase song song khi contract
chưa ổn định.

## 2. Phase 0 — Chốt baseline và tài liệu

### Mục tiêu

Khóa hành vi Compose cần giữ và quyết định scope v2.

### Công việc

- Chọn commit/tag baseline Compose.
- Chạy focused unit tests, assemble, lint theo repository guideline.
- Audit read-only /Users/macbook/Documents/Projects/Apps/slink-app-base.
- Tạo docs/reference-slink-audit.md với ADOPT/ADAPT/REJECT và source path cụ thể.
- Đọc các AGENTS.md/skills liên quan của slink nhưng không tự động sao chép toàn bộ.
- Chốt các giả định với giảng viên.
- Review Full-stack spec, architecture, data và API docs.
- Chốt monorepo/workspace tool sau khi so sánh nhu cầu luckgage với pattern từ slink.
- Chốt naming: luckgage, package/bundle IDs mới nếu cần.
- Chốt host demo và database.

### Exit gate

- Spec không còn câu hỏi chặn.
- Có baseline test/build result.
- Reference audit đã được review và không còn pattern quan trọng ở trạng thái chưa quyết định.
- Có ERD và route map được nhóm hiểu.
- Có một backlog theo vertical slice, không theo tầng kỹ thuật thuần túy.

## 3. Phase 1 — Expo mobile local và UI mới

### 1A. Foundation

- Bootstrap Expo + TypeScript + Router.
- Theme/token/light/dark.
- i18n vi/en.
- App shell và safe area.
- Local database/preferences.
- Error boundary/logging dev.
- Test setup.

Gate: app mở trên Android development environment, theme/language đổi được, navigation smoke pass.

### 1B. Trips vertical slice

- Domain calendar-date model.
- Trip local repository.
- Trips Hub.
- Create/edit/review flow.
- Trip Detail shell.
- Timeline grouping.
- Focused unit/component tests.

Gate: tạo/sửa/xóa trip, restart app vẫn còn dữ liệu.

### 1C. Checklist vertical slice

- Category/item local schema.
- Checklist CRUD.
- Progress/search/filter/bulk state.
- Inline quick-add.
- Undo delete item.

Gate: luồng checklist nhanh, 100% state và empty/error state hoàn chỉnh.

### 1D. Suggestions/weather/reminder

- Pure local rule port.
- Packing Studio preview/edit/apply.
- Direct Open-Meteo adapter tạm.
- Local notification.
- Optional QR bridge nếu thật sự cần.

Gate: parity nghiệp vụ cốt lõi với Compose nhưng UI là thiết kế mới.

### Phase 1 không làm

- Auth giả.
- Join UI kết nối dữ liệu giả kéo dài.
- Remote sync.
- Admin.
- Generic design system lớn trước khi screen thật ổn.

## 4. Phase 2 — Backend độc lập

### 2A. Foundation

- NestJS app.
- Config/environment validation.
- PostgreSQL + migration.
- Health endpoint.
- Request ID, logging và global error shape.
- OpenAPI.

Gate: database sạch migrate/seed được, health và OpenAPI chạy.

### 2B. Auth/users

- Register/login/refresh/logout.
- Password hashing.
- Session/revoke.
- USER/ADMIN guard.
- Current profile.
- Admin user list/status API.

Gate: auth integration test, suspended user bị chặn, không lộ token/hash.

### 2C. Trips/membership/checklist

- Trip CRUD + owner membership transaction.
- Invite create/preview/join/revoke.
- Members list/remove.
- Checklist CRUD/bulk.
- Permission integration tests.

Gate: hai user dùng API client có thể create/join/read/write cùng checklist.

### 2D. Suggestions/weather

- Packing rule schema/seed.
- Generate preview/apply transaction.
- Admin rule endpoints.
- Trip suggestion endpoints.
- Open-Meteo proxy/cache.

Gate: published rule tạo preview đúng; apply atomic; weather failure không làm trip API fail.

## 5. Phase 3 — Tích hợp Expo với backend

### 3A. Auth integration

- Auth screens.
- Secure credential storage.
- API client.
- Refresh coordination.
- Auth guard/route redirect.
- Logout cleanup.

Gate: register/login/restart/refresh/logout chạy trên development build.

### 3B. Chuyển source of truth

Theo thứ tự:

1. Trips.
2. Checklist.
3. Packing suggestions.
4. Weather.

Mỗi feature:

- Thay local adapter bằng remote adapter.
- Map API DTO sang domain/UI model.
- Thêm loading/refresh/offline state.
- Chạy contract/component test.
- Xóa production write path local tương ứng.

Gate: không có dual-write SQLite + API.

### 3C. Join collaboration

- Create invite.
- Join preview/confirm.
- Members screen.
- Pull-to-refresh/refetch-on-focus.
- Conflict behavior.

Gate: hai thiết bị/user cùng sửa checklist và nhìn thấy kết quả sau refresh.

### 3D. Migration cleanup

- SQLite chỉ còn preference/cache được chốt.
- QR copy được retire hoặc ghi rõ là one-way import riêng.
- Xóa mock/temporary adapter.
- Update docs.

Trạng thái triển khai: hoàn thành. Mobile chỉ còn dùng SQLite key-value cho preference và metadata
reminder cục bộ; trip, checklist, packing suggestions và weather dùng REST API làm source of truth.
Relational schema/adapters local và pure-local packing generator đã được xóa. QR snapshot copy được
retire; invite preview/confirm qua API là luồng cộng tác duy nhất.

## 6. Phase 4 — Admin web

### 4A. Foundation

- Vite React TypeScript.
- Admin auth/session.
- Router/layout/design tokens.
- API client/error handling.

### 4B. Users/dashboard

- Dashboard aggregate.
- User list/detail.
- Suspend/reactivate.

### 4C. Packing rules

- List/editor.
- Preview.
- Publish/archive/version.
- End-to-end mobile verification.

### 4D. Trip suggestions/trips

- CRUD/publish trip suggestions.
- Mobile consume/prefill.
- Trips support list.

Gate: admin publish thay đổi dữ liệu user thấy mà không sửa database thủ công.

## 7. Phase 5 — Hardening, deploy, rehearsal

- Security checklist.
- Performance smoke test.
- Accessibility audit.
- Error/empty/offline polish.
- Backup/restore demo database.
- Demo seed.
- Expo development/release build.
- Deploy API/admin/DB qua HTTPS.
- Rehearse kịch bản end-to-end.
- Cập nhật báo cáo và sơ đồ từ code thật.

## 8. Vertical slice backlog

Mỗi slice nên gồm UI + state + data + test, ví dụ:

### Slice: Create trip local

- Trip type/schema.
- SQLite repository.
- Create UI.
- Validation.
- Trips Hub update.
- Restart persistence test.

### Slice: Create trip server

- Migration.
- POST/GET API.
- Owner membership transaction.
- OpenAPI.
- Integration test.

### Slice: Create trip integrated

- Remote repository.
- Auth header.
- DTO mapping.
- UI error/retry.
- Component/contract test.

Tránh backlog kiểu “làm hết database rồi mới làm UI”.

## 9. Suggested checkpoints

Không gắn ngày cứng khi chưa biết deadline. Dùng checkpoint:

| Checkpoint | Demo bắt buộc |
|---|---|
| C1 | Expo UI shell + Trips Hub prototype |
| C2 | Expo local trip/checklist complete |
| C3 | Expo local Smart List complete |
| C4 | Backend auth/trip/join/checklist qua OpenAPI |
| C5 | Mobile login + remote trips |
| C6 | Hai user join và dùng shared checklist |
| C7 | Admin publish rule, mobile nhận rule |
| C8 | Deployment + full rehearsal |

## 10. Risk register

| Risk | Dấu hiệu sớm | Giảm thiểu |
|---|---|---|
| Port UI 1:1 | Screen giống Material cũ | Duyệt visual direction trước component build |
| Học quá nhiều framework cùng lúc | Foundation kéo dài, không có flow | Vertical slice, spike có timebox |
| Dual source of truth | SQLite và API khác nhau | Chuyển ownership từng feature, cấm dual-write |
| Auth nuốt thời gian | Mở rộng social/MFA/reset | MVP email/password + session/token revoke |
| Join bị gọi là realtime | Kỳ vọng update tức thì | Ghi rõ REST refresh trong UI/demo |
| Rule engine quá tổng quát | Admin nhập JSON/expression | Schema điều kiện hữu hạn |
| Admin xâm phạm riêng tư | Hiển thị checklist detail mặc định | Chỉ aggregate/support fields |
| Weather làm demo fail | Trip screen lỗi theo | Cache/fallback, demo seed |
| Expo Go khác release | Notification/native flow không chạy | Development build sớm |
| Báo cáo không khớp code | Tài liệu nói feature chưa có | Update docs ở mỗi exit gate |

## 11. Stop rules

Dừng mở rộng và quay về hoàn thiện khi:

- Core create/join/checklist chưa ổn mà nhóm muốn thêm realtime/chat.
- Auth chưa có integration test mà bắt đầu social login.
- Rule preview/apply chưa atomic mà bắt đầu AI.
- UI core chưa accessible mà thêm nhiều animation.
- Demo deployment chưa ổn mà thêm feature ngoài spec.

## 12. Deliverable theo phase

| Phase | Deliverable |
|---|---|
| 0 | Spec, ERD, API, baseline result |
| 1 | Expo local build + UI prototype + test |
| 2 | API container/service + migration + OpenAPI + integration tests |
| 3 | Expo integrated build + two-user collaboration demo |
| 4 | Admin web deploy + publish-to-mobile demo |
| 5 | Release/demo package, report, slides, rehearsal checklist |
