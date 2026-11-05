# 01 — Hiện trạng và migration matrix

## 1. Mục đích

Tài liệu này trả lời ba câu hỏi trước khi viết Expo:

1. Bản Compose hiện tại đã có hành vi nào đáng giữ?
2. Thành phần Android nào phải thay thế?
3. Phần nào được thiết kế lại thay vì port 1:1?

## 2. Baseline đã kiểm tra từ repository

Ứng dụng hiện tại là một module Android với dependency flow:

~~~text
Compose Screen
  -> ViewModel + StateFlow
  -> Repository
  -> Room / DataStore / Open-Meteo
~~~

Các màn hình chính:

- Onboarding.
- Trips list.
- Create/edit trip.
- Trip detail.
- Checklist.
- Smart List.
- Settings.

Các capability hiện có:

- Trip CRUD và timeline sorting.
- Checklist category/item CRUD, progress, search/filter, mark category.
- Smart List deterministic rules với preview/edit/apply.
- Open-Meteo location/forecast và weather cache.
- Local reminder.
- Text share và QR one-way copy.
- Light/dark/system, tiếng Việt/Anh, °C/°F.

Repository hiện có 40 unit test và 3 Android test được đánh dấu bằng @Test. Đây là số lượng
test trong source, không phải cam kết rằng mọi test đang pass ở mọi commit. Trước khi bắt đầu
Phase 1 phải chạy baseline build/test một lần và ghi commit/tag.

### 2.1. React Native reference repository

Repository tham chiếu:

~~~text
/Users/macbook/Documents/Projects/Apps/slink-app-base
~~~

slink-app-base là implementation reference, không phải product source of truth. Trước khi
bootstrap Expo, thực hiện audit read-only và ghi kết quả vào:

~~~text
docs/reference-slink-audit.md
~~~

Audit tối thiểu:

- AGENTS.md, AGENTS.override.md và inventory skills.
- package.json, lockfile và workspace configuration.
- Expo app config, Router, TypeScript, Babel và Metro.
- Feature/source layout.
- Theme, tokens, localization và accessibility.
- State, API client, auth, storage và environment config.
- Unit/component/e2e tests.
- Lint, format, CI và build scripts.

Mỗi pattern được phân loại:

| Quyết định | Ý nghĩa |
|---|---|
| ADOPT | Phù hợp trực tiếp, có thể dùng cùng convention. |
| ADAPT | Ý tưởng tốt nhưng phải đổi theo domain, scope hoặc version luckgage. |
| REJECT | Quá phức tạp, lỗi thời, trái spec hoặc không cần cho phase hiện tại. |

Không tự động copy dependency chỉ vì slink sử dụng. Version Expo/package phải được kiểm tra lại
với tài liệu chính thức ở thời điểm bootstrap.

## 3. Data model hiện tại

### Trip

- UUID dạng string.
- name, destination, startDate, endDate, tripType, note.
- Destination details gồm provider ID, tọa độ, timezone và country metadata.
- createdAt, updatedAt.
- reminderDaysBefore.

### Checklist

- Trip có nhiều ChecklistCategory.
- Category có orderIndex và nhiều ChecklistItem.
- Item có quantity, note, isChecked, orderIndex và createdAt.
- Room dùng cascade delete từ trip xuống category/item và weather cache.

### Smart List

Input hiện có destination, trip type, ngày, activities, transportation, accommodation, notes,
language và optional weather.

Rule hiện có:

- Documents.
- Clothing theo số ngày.
- Beach, hiking, camping và international.
- Activities.
- Rain, low temperature và high temperature.

Hành vi này là baseline logic, không phải schema bắt buộc của backend. Backend v2 sẽ cho phép
admin quản lý rule nhưng vẫn phải tái tạo cùng invariant preview/confirm/append.

## 4. Phân loại migration

### 4.1. Giữ nguyên ý nghĩa nghiệp vụ

| Hành vi | Lý do giữ |
|---|---|
| Calendar date cho start/end | Không để timezone làm đổi ngày chuyến đi. |
| End date không trước start date | Validation cốt lõi. |
| Timeline upcoming/in-progress/past | Cần cho trips hub. |
| Checklist progress theo item count | Dễ hiểu và đã có test. |
| Category/item ordering | Cần UI ổn định. |
| Suggestion preview trước apply | Product invariant. |
| Apply chỉ append | Bảo vệ checklist. |
| Weather optional | Core flow không phụ thuộc dịch vụ ngoài. |
| Settings theme/language/unit | Trải nghiệm nền tảng. |

### 4.2. Giữ concept, thiết kế lại UX

| Compose hiện tại | Expo v2 |
|---|---|
| Trips list thiên về danh sách card | Trips Hub có hero cho trip gần nhất, readiness và nhóm thời gian. |
| Form trip một màn hình | Flow theo bước ngắn, có progress và review trước save. |
| Trip detail dài | Command center theo section, hành động ưu tiên rõ. |
| Checklist theo Material card | Danh sách gọn, inline quick-add và sticky progress. |
| Smart List là form + preview | “Packing Studio” có reason badge và before/after summary. |
| QR copy | Giữ tạm trong Expo-local nếu cần demo; thay bằng join code khi tích hợp. |
| Settings kỹ thuật | Profile & Settings thân thiện hơn nhưng vẫn giữ lựa chọn cũ. |

### 4.3. Thay thế hạ tầng

| Android/Compose | Expo/full-stack | Ghi chú |
|---|---|---|
| Kotlin data class | TypeScript type/schema | Không dùng API DTO làm UI state. |
| ViewModel + StateFlow | Feature hooks + reducer/query state | Durable server state tách khỏi editing state. |
| Room | Expo SQLite ở Phase 1; PostgreSQL sau tích hợp | Local DB trở thành cache hoặc bị thu hẹp. |
| DataStore | Key-value preferences | Không lưu token vào preference thường. |
| Hilt | Explicit composition/providers | Tránh tạo DI container phức tạp cho mobile. |
| Retrofit | Typed API client sinh từ OpenAPI hoặc wrapper tập trung | Không gọi fetch rải rác trong screen. |
| WorkManager | Expo Notifications | Remote push cần development build, không chỉ Expo Go. |
| Google Code Scanner | Expo Camera barcode scan | Chỉ giữ nếu QR còn trong scope. |
| Android Sharesheet | React Native Share API | Nội dung share vẫn plain text. |
| resources/strings.xml | i18n message files | Giữ key ổn định, không ghép câu khó dịch. |
| Navigation Compose typed routes | Expo Router | Route param chỉ chứa ID nhỏ. |
| Material dynamic color | Semantic design tokens | Không để màu hệ thống phá brand v2. |

## 5. Mapping domain type

| Kotlin | TypeScript/API |
|---|---|
| LocalDate | String YYYY-MM-DD |
| epoch millis | ISO-8601 UTC timestamp |
| UUID string | UUID string |
| TripType enum | String enum có validation server |
| Result/DataError | Typed result nội bộ; HTTP problem ở boundary |
| Flow list | Query result + invalidation/refetch |
| nullable field | Explicit optional/nullable theo contract; không trộn hai nghĩa |

Quy tắc quan trọng:

- Calendar date không được parse thành Date rồi serialize lại qua timezone.
- Timestamp phải có Z hoặc offset.
- Server không nhận role/ownerId từ client rồi tin trực tiếp.
- ID trong route là opaque; UI không suy luận quyền từ ID.

## 6. Feature parity matrix

| Feature | Expo local | Backend | Integrated mobile | Admin |
|---|:---:|:---:|:---:|:---:|
| Onboarding | Build mới | — | Gắn auth/create/join | — |
| Theme/language/unit | Local | Optional profile defaults | Local-first preference | — |
| Trip CRUD | SQLite | REST + PostgreSQL | Remote source of truth | Read-only support |
| Checklist CRUD | SQLite | REST + PostgreSQL | Shared state | Không mặc định xem detail |
| Smart List | Local rules | Managed rules + preview/apply | Server preview/apply | CRUD/preview/publish |
| Weather | Direct Open-Meteo | Proxy/cache | Qua backend | — |
| Reminder | Local notification | Push later | Local first | — |
| QR local copy | Optional bridge | — | Retire khi join ổn định | — |
| Join trip | — | Membership/invite | Create/join/manage | Metrics only |
| User account | — | Auth/RBAC | Login/profile | Manage status |
| Trip suggestions | Static seed optional | Published content | Consume/prefill | CRUD/publish |

## 7. Repository seam cho migration

Trong Expo local, feature không được gọi SQLite trực tiếp từ screen. Dùng repository contract
nhỏ theo từng domain:

~~~text
TripScreen -> useTrips -> TripRepository
                              |- LocalTripRepository
                              |- ApiTripRepository
~~~

Chỉ tạo contract cho Trip, Checklist, Suggestions, Settings và Weather. Không tạo generic
BaseRepository hoặc generic CRUD framework.

Khi tích hợp backend:

1. Thay binding LocalTripRepository bằng ApiTripRepository.
2. Giữ UI state và validation ở feature.
3. Chạy contract tests chung cho hai adapter ở những hành vi thực sự giống nhau.
4. Xóa adapter local khỏi production path sau khi remote ổn định; không duy trì hai nguồn sự
   thật vô thời hạn.

## 8. Dữ liệu cũ trên thiết bị

MVP mặc định không migrate Room database từ APK Compose sang Expo. Lý do:

- Ứng dụng chưa phải sản phẩm production có dữ liệu khách hàng bắt buộc bảo toàn.
- Expo app có application/runtime khác; tự đọc Room database làm tăng native complexity.
- Backend v2 thay đổi ownership và membership.

Nếu giảng viên bắt buộc chứng minh migration, phương án riêng là export snapshot JSON có version
từ app cũ và import preview trong app mới. Không truy cập trực tiếp file SQLite nội bộ của app
cũ.

## 9. Những phần không được port nguyên trạng

- Material component hierarchy và spacing cũ.
- Hilt/ViewModel boilerplate.
- Room entity làm API shape.
- Android-specific permission flow.
- QR copy được gọi là “join”.
- Full local-first sync phức tạp.
- Toàn bộ nội dung báo cáo Classroom Edition như thể nó mô tả v2.

## 10. Baseline gate trước khi code Expo

- Chọn một commit Compose làm baseline.
- Chạy unit test, assemble và lint theo hướng dẫn repository.
- Ghi lại screen/feature inventory.
- Chụp tối thiểu các flow cũ để đối chiếu hành vi, không dùng làm visual target.
- Hoàn thành docs/reference-slink-audit.md và review các quyết định ADOPT/ADAPT/REJECT.
- Chốt các open question trong Full-stack spec.
- Không sửa Compose đồng thời với việc port trừ bug chặn migration.
