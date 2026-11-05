# Prompt khởi tạo luckgage v2

Đây là workspace mới cho luckgage Full-stack Edition:

~~~text
/Users/macbook/Documents/Projects/Apps/luckgage-v2
~~~

Mục tiêu của lượt này là hoàn thành Phase 0 repository foundation và bootstrap tối thiểu Expo
mobile của Phase 1A. Không xây feature nghiệp vụ, backend hoặc admin web.

## Nguồn thông tin và thứ tự ưu tiên

### Product source of truth

Đọc đầy đủ:

- PROJECT_SPEC_FULLSTACK_EDITION.md
- PROJECT_SPEC_CLASSROOM_EDITION.md
- docs/fullstack-migration/README.md
- docs/fullstack-migration/01_CURRENT_STATE_AND_MIGRATION.md
- docs/fullstack-migration/02_TARGET_ARCHITECTURE.md
- docs/fullstack-migration/03_MOBILE_EXPO_AND_UI_UX.md
- docs/fullstack-migration/07_DELIVERY_ROADMAP.md
- docs/fullstack-migration/08_QUALITY_SECURITY_OPERATIONS.md

### Android behavior baseline

Repository read-only:

~~~text
/Users/macbook/Documents/Projects/Apps/luckgage
~~~

Chỉ tham khảo domain behavior, test và product invariants. Không port UI Compose, Room, Hilt,
ViewModel hoặc Android-specific code.

### React Native implementation reference

Repository read-only:

~~~text
/Users/macbook/Documents/Projects/Apps/slink-app-base
~~~

Chỉ tham khảo implementation pattern. Không chỉnh sửa, di chuyển, format hoặc tạo file trong
repository này.

Nếu các nguồn xung đột, dùng thứ tự:

1. PROJECT_SPEC_FULLSTACK_EDITION.md.
2. Bộ tài liệu fullstack-migration.
3. Code đang tồn tại trong luckgage-v2.
4. Compose repository cho hành vi baseline.
5. slink-app-base cho implementation pattern.

## Read-only preflight

Trước khi viết file:

1. Kiểm tra git status và inventory workspace luckgage-v2.
2. Kiểm tra phiên bản Node và package managers đang có.
3. Đọc toàn bộ tài liệu được liệt kê ở trên.
4. Inspect repository slink-app-base:
   - AGENTS.md và AGENTS.override.md nếu có.
   - Liệt kê .agents/skills và .codex/skills nếu có.
   - Chỉ đọc đầy đủ những SKILL.md liên quan trực tiếp tới Expo, React Native, TypeScript,
     mobile UI, networking, storage, testing và architecture.
   - package.json, lockfile và workspace configuration.
   - app.json, app.config.*, eas.json nếu có.
   - tsconfig, Babel và Metro.
   - Expo Router/navigation.
   - src/features, design, data, services và repositories.
   - State management, API client, auth và environment config.
   - Theme, design tokens, localization và accessibility.
   - Testing, lint, formatting, CI và build scripts.
5. Tra cứu tài liệu Expo chính thức để xác nhận phiên bản stable và bootstrap command hiện tại.
6. Nêu ngắn gọn assumptions, xung đột và phạm vi file dự kiến thay đổi, sau đó tiếp tục nếu
   không có blocker thực sự.

Nếu sandbox không cho đọc slink-app-base hoặc legacy Compose repository, báo chính xác path bị
chặn và yêu cầu read-only access. Không copy repository vào luckgage-v2 để né quyền.

## Reference audit

Tạo:

~~~text
docs/reference-slink-audit.md
~~~

Tài liệu phải có:

- Tổng quan stack/version của slink.
- Cấu trúc source và ownership.
- Inventory AGENTS.md/skills liên quan.
- Workspace/package-manager pattern.
- Expo/navigation/config pattern.
- Theme/UI/accessibility pattern.
- State/data/API/storage pattern.
- Testing/lint/CI/build pattern.
- Risk hoặc phần lỗi thời.

Với từng pattern quan trọng, ghi:

| Pattern | Source path trong slink | ADOPT / ADAPT / REJECT | Lý do | Cách áp dụng |
|---|---|---|---|---|

Quy tắc:

- Không copy app identity, package/bundle ID, endpoint, secret, credential, asset thương hiệu,
  domain model hoặc business copy của slink.
- Không thêm dependency chỉ vì slink đang dùng.
- Không tạo symlink giữa repositories.
- Không mặc định version của slink còn mới.
- Pattern phức tạp hơn nhu cầu Phase 1A phải được ADAPT hoặc REJECT.
- Không dừng sau audit; dùng kết quả đã có căn cứ để bootstrap foundation.

## Foundation cần triển khai

### Repository guidance

Tạo AGENTS.md ngắn gọn ở root. Nội dung bền vững, không copy toàn bộ đặc tả:

- Mục tiêu và stack luckgage v2.
- Source documents phải đọc.
- Thứ tự phase.
- TypeScript strict.
- Không port UI Compose 1:1.
- Smart List preview, confirm và append.
- Weather không chặn core flow.
- Không thêm dependency/abstraction ngoài scope.
- Verification và documentation rules.
- slink-app-base chỉ là read-only implementation reference.

Không copy nguyên AGENTS.md của slink. Chỉ ADAPT rule phù hợp và ghi nguồn trong audit.

### Project README

Tạo README.md cho v2:

- Giới thiệu Expo mobile, API và admin.
- Trạng thái hiện tại là Phase 1A foundation.
- Link tới spec, migration docs và reference audit.
- Hướng dẫn cài đặt/chạy/kiểm tra sau bootstrap.
- Nêu backend/admin chưa được scaffold.

### Git/workspace

- Khởi tạo Git nếu chưa có .git.
- Không tự commit, push hoặc tạo remote.
- Chọn workspace/package-manager tool tối giản sau khi audit slink và môi trường.
- Ghi quyết định vào reference audit hoặc README.
- Chuẩn bị root workspace để sau này hỗ trợ apps và packages, nhưng không tạo placeholder trống
  không cần thiết.

### Expo mobile

Scaffold duy nhất:

~~~text
apps/mobile
~~~

Yêu cầu:

- Expo + React Native + TypeScript.
- Expo Router.
- Phiên bản stable tương thích tại thời điểm thực hiện.
- TypeScript strict.
- Route files mỏng; source chính đặt trong src khi pattern này tương thích với Expo Router.
- App shell tối thiểu có safe area.
- Một màn hình xác nhận luckgage v2 foundation chạy được.
- Không triển khai Trips, Checklist, Smart List, Auth hoặc SQLite trong lượt này.
- Không tạo design system lớn.

### Repository files

Tạo khi cần:

- .gitignore.
- .editorconfig.
- .env.example chỉ có public API base URL giả.
- Root scripts tối thiểu để chạy mobile và typecheck.

Không commit secret. Mọi biến đóng gói trong mobile đều được xem là public.

## Explicit non-goals

- Không tạo apps/api.
- Không tạo apps/admin.
- Không xây domain feature.
- Không thêm state-management, networking, database hoặc form library chưa được dùng.
- Không sao chép code Kotlin/Compose.
- Không sao chép toàn bộ cấu trúc slink nếu chưa được đánh giá.
- Không sửa product spec, trừ link/path sai và phải giải thích.
- Không commit hoặc push.

## Verification

Thực hiện các kiểm tra nhỏ nhất chứng minh foundation hoạt động:

- Dependency install thành công.
- Expo project/config được nhận diện.
- TypeScript typecheck pass.
- Lint/test/config doctor nếu scaffold cung cấp và môi trường hỗ trợ.
- Root mobile start command tồn tại và hợp lệ.
- git diff --check.
- git status chỉ có file foundation và tài liệu audit dự kiến.

Không tự động cài APK, mở emulator hoặc chạy connected/device tests trong lượt này.

## Kết quả cần báo cáo

Cuối lượt:

1. Tóm tắt pattern ADOPT/ADAPT/REJECT quan trọng từ slink.
2. Liệt kê file đã tạo/sửa.
3. Liệt kê dependency và lý do.
4. Liệt kê command kiểm tra cùng kết quả thực tế.
5. Nêu assumptions, giới hạn và blocker còn lại.
6. Xác nhận chưa bắt đầu backend/admin hoặc feature nghiệp vụ.
