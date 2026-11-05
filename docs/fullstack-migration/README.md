# Bộ tài liệu migration luckgage v2

Đây là bộ tài liệu điều hành quá trình chuyển luckgage từ Android/Compose local-first sang hệ
thống full-stack gồm Expo mobile, backend tự xây và React admin.

## Nguồn sự thật

- Đặc tả v2: [PROJECT_SPEC_FULLSTACK_EDITION.md](../../PROJECT_SPEC_FULLSTACK_EDITION.md)
- Đặc tả bản Compose hiện tại:
  [PROJECT_SPEC_CLASSROOM_EDITION.md](../../PROJECT_SPEC_CLASSROOM_EDITION.md)
- Code Compose hiện tại là baseline hành vi đã có.
- Khi code, đặc tả và tài liệu xung đột, dừng và ghi decision trước khi sửa hành vi.

## Prompt khởi tạo

Dùng [INIT_PROMPT.md](../../INIT_PROMPT.md) cho lượt Codex đầu tiên sau khi mở workspace mới.
Prompt này yêu cầu agent:

- Đọc đặc tả và tài liệu migration trước khi tạo code.
- Audit repository React Native tham chiếu ở chế độ read-only.
- Tạo AGENTS.md ngắn gọn cho luckgage v2.
- Chỉ bootstrap Expo mobile của Phase 1A.
- Không dựng backend/admin hoặc copy code tham chiếu một cách mù quáng.

## Repository tham chiếu

### Android behavior baseline

Đường dẫn:

~~~text
/Users/macbook/Documents/Projects/Apps/luckgage
~~~

Repository này chỉ dùng để đối chiếu hành vi, domain rules và test hiện có. Không port UI
Compose hoặc hạ tầng Android sang v2.

### React Native implementation reference

Đường dẫn:

~~~text
/Users/macbook/Documents/Projects/Apps/slink-app-base
~~~

Repository này chỉ được đọc để tham khảo:

- AGENTS.md, skills và project instructions.
- Workspace/package-manager configuration.
- Expo/React Native/TypeScript structure.
- Navigation, theme, localization, data/API, testing, lint và CI patterns.

Trước khi scaffold, agent phải tạo docs/reference-slink-audit.md với quyết định ADOPT, ADAPT hoặc
REJECT cho từng pattern quan trọng. Không sửa repository tham chiếu, không tạo symlink và không
copy app identity, secret, endpoint, asset thương hiệu hoặc dependency không phục vụ luckgage.

Thứ tự ưu tiên khi có xung đột:

1. PROJECT_SPEC_FULLSTACK_EDITION.md.
2. Bộ tài liệu fullstack-migration.
3. Code đang tồn tại trong luckgage-v2.
4. Compose repository cho hành vi baseline.
5. slink-app-base cho implementation pattern.

## Thứ tự đọc

1. [Prompt khởi tạo](../../INIT_PROMPT.md)
2. [01 — Hiện trạng và migration matrix](01_CURRENT_STATE_AND_MIGRATION.md)
3. [02 — Kiến trúc đích](02_TARGET_ARCHITECTURE.md)
4. [03 — Expo mobile và định hướng UI/UX](03_MOBILE_EXPO_AND_UI_UX.md)
5. [04 — Backend và mô hình dữ liệu](04_BACKEND_AND_DATA.md)
6. [05 — Hợp đồng REST API](05_API_CONTRACT.md)
7. [06 — Web quản trị](06_ADMIN_WEB.md)
8. [07 — Roadmap và quality gates](07_DELIVERY_ROADMAP.md)
9. [08 — Quality, security và vận hành](08_QUALITY_SECURITY_OPERATIONS.md)
10. [09 — Kịch bản demo và bảo vệ](09_DEMO_AND_DEFENSE.md)

## Thứ tự triển khai đã chốt

~~~text
Phase 0  Chốt tài liệu và baseline Compose
Phase 1  Thiết kế lại + xây Expo mobile local
Phase 2  Xây backend và PostgreSQL độc lập
Phase 3  Tích hợp Expo với backend
Phase 4  Xây admin web trên cùng API
Phase 5  Hardening, deploy và rehearsal
~~~

Không xây admin trước khi API admin ổn định. Không tích hợp backend khi backend chưa có
integration test cho auth, permission, join và transaction checklist.

## Stack mặc định

| Bề mặt | Mặc định |
|---|---|
| Mobile | Expo, React Native, TypeScript, Expo Router |
| Mobile persistence giai đoạn local | Expo SQLite; preferences dùng key-value storage |
| Mobile credential | Expo SecureStore |
| Backend | Node.js, TypeScript, NestJS theo modular monolith |
| API | REST, JSON, OpenAPI, version prefix v1 |
| Database | PostgreSQL và migration được version-control |
| ORM | Prisma nếu spike xác nhận tương thích với phiên bản Node/Nest đã chọn |
| Admin | React, TypeScript, Vite |
| External data | Open-Meteo geocoding và forecast |

Không khóa version package trong tài liệu quy hoạch. Khi bootstrap từng app, dùng phiên bản
stable tương thích tại thời điểm đó và commit lockfile.

## Nguyên tắc triển khai

- Mỗi phase phải tạo ra một sản phẩm chạy được, không chỉ một tập file rời.
- Port nghiệp vụ, không port pixel.
- Tạo abstraction chỉ khi phục vụ migration seam thật: local repository sang remote repository.
- Không tạo sync engine tổng quát trong MVP.
- Không chia backend thành microservices.
- Không đưa AI vào tên gọi hoặc marketing.
- Không thêm tab/mobile feature chỉ vì admin có CRUD tương ứng.
- Mọi thay đổi scope phải cập nhật spec trước khi code.

## Definition of Ready cho một feature

- Có user story và acceptance criteria.
- Biết dữ liệu thuộc local, server hay chỉ là UI state.
- Biết role nào có quyền.
- Có loading, empty, error và retry behavior.
- Có API contract nếu feature đi qua backend.
- Có test level phù hợp.

## Definition of Done cho một feature

- Luồng happy path và failure path chạy được.
- Permission được kiểm tra phía server.
- Không làm hỏng product invariants.
- Có test focused.
- UI có accessibility label và tap target phù hợp.
- Tài liệu liên quan được cập nhật.
- Không có secret hoặc demo credential trong source.

## Tài liệu tham chiếu chính thức

- [Expo Router](https://docs.expo.dev/router/introduction/)
- [Expo data storage](https://docs.expo.dev/develop/user-interface/store-data/)
- [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Expo Camera](https://docs.expo.dev/versions/latest/sdk/camera/)
- [NestJS OpenAPI](https://docs.nestjs.com/openapi/introduction)
- [NestJS authentication](https://docs.nestjs.com/security/authentication)
- [Prisma PostgreSQL](https://www.prisma.io/docs/orm/core-concepts/supported-databases/postgresql)
- [Vite](https://vite.dev/guide/)
- [OWASP REST Security](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)
- [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OpenAI Codex prompting guide](https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide)
- [OpenAI Codex development workflows](https://developers.openai.com/cookbook/examples/codex/iterating-development-workflows-with-codex)
