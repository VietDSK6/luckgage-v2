# 04 — Backend và mô hình dữ liệu

## 1. Mục tiêu backend

Backend tồn tại để:

- Xác thực user/admin.
- Làm nguồn sự thật cho trip, membership và checklist dùng chung.
- Cung cấp join flow.
- Quản lý và chạy packing rules.
- Phục vụ trip suggestions.
- Chuẩn hóa location/weather.
- Cho admin web dùng cùng một API.

Backend không tồn tại chỉ để proxy CRUD. Permission, transaction và invariants phải được giữ ở
server.

## 2. Stack và trade-off

Mặc định:

- Node.js + TypeScript.
- NestJS.
- PostgreSQL.
- Prisma sau một technical spike ngắn.
- OpenAPI/Swagger.
- Docker Compose cho local PostgreSQL và API nếu thuận tiện.

NestJS được chọn vì module, validation, guard, DI và OpenAPI dễ tổ chức và dễ trình bày. Chi phí là
nhóm phải học thêm convention. Nếu spike cho thấy NestJS/Prisma làm nhóm chậm đáng kể, có thể đổi
ORM hoặc framework nhưng phải giữ module boundary, transaction và API contract trong tài liệu.

Không trộn hai ORM trong cùng backend.

## 3. Module responsibilities

### AuthModule

- Register/login/refresh/logout.
- Password hashing.
- Session/refresh-token rotation và revoke.
- Authentication guard.
- Rate limiting integration.

### UsersModule

- Current profile.
- Admin list/search user.
- Suspend/reactivate.
- Không chứa trip/checklist logic.

### TripsModule

- Trip CRUD.
- Trip timeline filter.
- Owner-only operations.
- Gọi membership service để authorize.

### MembershipsModule

- Owner membership khi tạo trip.
- Join code lifecycle.
- Join, list members, remove member.
- Không có realtime presence.

### ChecklistsModule

- Category/item CRUD.
- Search/filter có thể làm client-side ở MVP nếu checklist nhỏ.
- Bulk check category.
- Progress response.

### PackingSuggestionsModule

- Admin CRUD rule/item.
- Validate/publish/version rule.
- Generate preview.
- Apply selected preview trong transaction.

### TripSuggestionsModule

- Admin CRUD/publish content.
- User list/detail published content.
- Prefill data cho create trip.

### WeatherModule

- Location search.
- Forecast mapping/cache.
- Circuit/timeout behavior đơn giản.
- Không làm Trip service thất bại khi Open-Meteo lỗi.

### AdminModule

- Dashboard aggregate.
- Admin-only policy/guard.
- Không chứa duplicate business logic từ Users/Suggestions.

## 4. ERD mức khái niệm

~~~mermaid
erDiagram
    USER ||--o{ AUTH_SESSION : owns
    USER ||--o{ TRIP_MEMBER : joins
    TRIP ||--o{ TRIP_MEMBER : has
    TRIP ||--o{ TRIP_INVITE : creates
    USER ||--o{ TRIP_INVITE : issues
    TRIP ||--o{ CHECKLIST_CATEGORY : contains
    CHECKLIST_CATEGORY ||--o{ CHECKLIST_ITEM : contains
    TRIP ||--o| WEATHER_CACHE : has
    PACKING_RULE ||--o{ PACKING_RULE_ITEM : outputs
    USER ||--o{ AUDIT_LOG : acts

    USER {
        uuid id PK
        text email UK
        text password_hash
        text display_name
        enum role
        enum status
        text locale
        timestamptz created_at
        timestamptz updated_at
    }

    TRIP {
        uuid id PK
        text name
        text destination_label
        date start_date
        date end_date
        enum trip_type
        int version
        timestamptz created_at
        timestamptz updated_at
    }

    TRIP_MEMBER {
        uuid trip_id FK
        uuid user_id FK
        enum role
        timestamptz joined_at
        timestamptz removed_at
    }

    CHECKLIST_CATEGORY {
        uuid id PK
        uuid trip_id FK
        text name
        int position
        int version
    }

    CHECKLIST_ITEM {
        uuid id PK
        uuid category_id FK
        text name
        int quantity
        boolean is_packed
        text note
        int position
        int version
    }
~~~

## 5. Bảng dữ liệu

### 5.1. users

| Field | Type | Quy tắc |
|---|---|---|
| id | UUID | PK, server-generated |
| email | text/citext | unique, normalized |
| password_hash | text | không bao giờ trả ra API |
| display_name | text | 1–80 ký tự |
| role | USER / ADMIN | default USER |
| status | ACTIVE / SUSPENDED | default ACTIVE |
| locale | vi / en | default vi |
| created_at | timestamptz | server time |
| updated_at | timestamptz | server time |
| last_login_at | timestamptz nullable | audit nhẹ |

Không dùng soft-delete boolean riêng khi status đã biểu diễn quyền truy cập. Xóa tài khoản cần
chính sách dữ liệu riêng và ngoài MVP.

### 5.2. auth_sessions

| Field | Type | Quy tắc |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK users |
| refresh_token_hash | text | unique/hash, không lưu raw token |
| device_label | text nullable | hiển thị cho support/user sau này |
| expires_at | timestamptz | bắt buộc |
| created_at | timestamptz | bắt buộc |
| last_used_at | timestamptz nullable | optional |
| revoked_at | timestamptz nullable | active khi null |
| rotated_from_id | UUID nullable | truy vết rotation |

Index user_id và refresh_token_hash.

### 5.3. trips

| Field | Type | Quy tắc |
|---|---|---|
| id | UUID | PK |
| name | text | fallback destination nếu trống ở client; server vẫn lưu resolved name |
| destination_label | text | bắt buộc |
| start_date | date | calendar date |
| end_date | date | end >= start |
| trip_type | enum | whitelist |
| note | text nullable | giới hạn chiều dài |
| provider_place_id | text nullable | Open-Meteo/provider identifier |
| latitude/longitude | numeric nullable | cùng null hoặc cùng có |
| destination_timezone | text nullable | IANA timezone |
| country_code | text nullable | ISO code nếu có |
| admin_area/country | text nullable | display metadata |
| version | integer | bắt đầu 1 |
| created_at/updated_at | timestamptz | server time |

Không lưu owner_id như một nguồn quyền thứ hai. Ownership được biểu diễn bởi trip_members.role.

### 5.4. trip_members

| Field | Type | Quy tắc |
|---|---|---|
| trip_id | UUID | FK trips |
| user_id | UUID | FK users |
| role | OWNER / MEMBER | một owner active trong MVP |
| joined_at | timestamptz | bắt buộc |
| removed_at | timestamptz nullable | active khi null |

Unique trip_id + user_id. Create trip transaction chèn trip và owner membership. Rejoin sẽ
reactivate membership cũ hoặc trả idempotent success theo policy đã test.

Server service bảo đảm mỗi trip có đúng một owner active. Nếu database/ORM hỗ trợ partial unique
index rõ ràng, bổ sung index cho OWNER active; nếu không, lock/transaction tại service.

### 5.5. trip_invites

| Field | Type | Quy tắc |
|---|---|---|
| id | UUID | PK |
| trip_id | UUID | FK trips |
| code_hash | text | unique; không log raw code |
| code_hint | text | 2 ký tự cuối để support |
| created_by_user_id | UUID | owner |
| expires_at | timestamptz | bắt buộc |
| max_uses | integer | >= 1 |
| use_count | integer | default 0 |
| revoked_at | timestamptz nullable | revoked khi có |
| created_at | timestamptz | bắt buộc |

Join transaction phải:

1. Tìm invite bằng hash.
2. Kiểm tra revoke/expiry/maxUses.
3. Kiểm tra trip và user active.
4. Tạo/reactivate membership.
5. Tăng useCount nếu đây là join mới.

### 5.6. checklist_categories

| Field | Type | Quy tắc |
|---|---|---|
| id | UUID | PK |
| trip_id | UUID | FK, cascade khi trip bị xóa |
| name | text | 1–80 |
| position | integer | >= 0 |
| version | integer | bắt đầu 1 |
| created_at/updated_at | timestamptz | bắt buộc |

Index trip_id + position.

### 5.7. checklist_items

| Field | Type | Quy tắc |
|---|---|---|
| id | UUID | PK |
| category_id | UUID | FK, cascade |
| name | text | 1–120 |
| quantity | integer | 1–99 |
| is_packed | boolean | default false |
| note | text nullable | giới hạn chiều dài |
| position | integer | >= 0 |
| version | integer | bắt đầu 1 |
| created_by_user_id | UUID nullable | audit/collaboration |
| created_at/updated_at | timestamptz | bắt buộc |

Index category_id + position. Không tạo unique name; người dùng được phép có hai item cùng tên.

### 5.8. weather_cache

MVP có thể cache theo trip:

- trip_id PK/FK.
- start_date/end_date.
- latitude/longitude.
- payload_json.
- fetched_at.
- expires_at.

Payload JSON chỉ chứa normalized weather response do server sở hữu, không lưu nguyên response
không kiểm soát. Khi schema response đổi, có cache_version.

### 5.9. packing_rules

Rule schema cố ý giới hạn để giải thích và validate được:

| Field | Type | Ý nghĩa |
|---|---|---|
| id | UUID | PK |
| key | text | stable key |
| name | text | tên admin |
| status | DRAFT/PUBLISHED/ARCHIVED | lifecycle |
| version | integer | tăng khi publish |
| priority | integer | thứ tự áp dụng |
| trip_type | enum nullable | match nếu có |
| min_days/max_days | integer nullable | range |
| min_temp_c/max_temp_c | numeric nullable | range |
| min_rain_percent | integer nullable | 0–100 |
| activity_key | text nullable | match normalized activity |
| reason_vi/reason_en | text | giải thích |
| created_by/updated_by | UUID | admin |
| created_at/updated_at/published_at | timestamptz | audit |

Các condition không null trong một rule dùng AND. Nhiều rule là các nhánh độc lập. Không cho admin
nhập JavaScript, SQL hoặc biểu thức tùy ý.

### 5.10. packing_rule_items

| Field | Type | Ý nghĩa |
|---|---|---|
| id | UUID | PK |
| rule_id | UUID | FK |
| category_key | text | stable grouping key |
| category_name_vi/en | text | localized label |
| item_key | text | dùng dedupe |
| item_name_vi/en | text | localized label |
| quantity_mode | FIXED/PER_DAY | cách tính |
| base_quantity | integer | >= 1 |
| note_vi/en | text nullable | optional |
| position | integer | output order |

Nếu một item match nhiều rule, engine dedupe theo category_key + item_key và gộp reason. Quantity
policy mặc định lấy max, không cộng vô hạn.

### 5.11. trip_suggestions

- id, slug.
- title_vi/en.
- summary_vi/en.
- destination_label và optional provider metadata.
- image_url và image_alt_vi/en.
- tags.
- status DRAFT/PUBLISHED/ARCHIVED.
- sort_order.
- created_by/updated_by.
- created_at/updated_at/published_at.

User API chỉ trả PUBLISHED.

### 5.12. audit_logs

Đưa vào Phase 4 nếu thời gian cho phép, tối thiểu cho:

- User suspended/reactivated.
- Packing rule published/archived.
- Trip suggestion published/archived.

Field: actor_user_id, action, target_type, target_id, metadata đã lọc, created_at. Không lưu
password, token hoặc full join code.

## 6. Packing rule algorithm

~~~text
Input trip + activities + normalized weather
  -> load PUBLISHED rules
  -> filter từng rule theo các condition non-null
  -> materialize localized output item
  -> calculate quantity
  -> deduplicate theo categoryKey + itemKey
  -> merge reasons và chọn quantity policy
  -> sort priority/position
  -> trả preview, không ghi database
~~~

Preview response cần chứa:

- category/item ID tạm thời cho UI.
- display name, quantity, note.
- reason.
- matchedRuleId và version cho trace/debug.
- source label rule-based.

Apply request gửi phiên bản đã chỉnh sửa mà user xác nhận. Server không generate lại rồi bỏ qua
chỉnh sửa của user. Server validate lại text, quantity, membership và size limit, sau đó append
trong transaction.

## 7. Permission matrix

| Hành động | Member | Owner | Admin |
|---|:---:|:---:|:---:|
| Đọc trip/checklist mình tham gia | ✓ | ✓ | Không mặc định |
| Sửa item/check state | ✓ | ✓ | Không mặc định |
| Sửa metadata trip | Theo policy: owner-only trong MVP | ✓ | Không |
| Xóa trip | — | ✓ | Không mặc định |
| Tạo/revoke invite | — | ✓ | — |
| List/remove member | Xem list | ✓ | — |
| Generate/apply packing suggestion | ✓ | ✓ | — |
| Quản lý packing rule | — | — | ✓ |
| Quản lý trip suggestion | — | — | ✓ |
| Suspend user | — | — | ✓ |

Admin không phải superuser tự động đọc mọi checklist. Nếu cần support access, thiết kế permission
và audit riêng.

## 8. Delete và retention policy

- Delete trip: hard delete bằng transaction/cascade sau confirm owner.
- Remove member: set removed_at để hỗ trợ audit/rejoin.
- Suspend user: không xóa trip/checklist.
- Published rule/content: archive thay vì hard delete.
- Auth session hết hạn/revoked có thể cleanup theo scheduled job.
- Weather cache có TTL và cleanup.

## 9. Migration và seed

### Migration

- Mọi schema change tạo migration file trong Git.
- Review SQL/destructive warning trước apply.
- Không dùng reset database trong demo/prod.
- CI/test database được tạo từ migration, không từ schema sync không version.

### Seed

Tách:

- Reference seed: trip types nếu lưu bảng, admin role bootstrap policy.
- Content seed: packing rules mẫu, trip suggestions mẫu.
- Demo seed: ba user/trip/checklist; chỉ chạy trong local/demo.

Demo password không commit dưới dạng production credential. Script nhận password qua env hoặc
tạo giá trị chỉ dành cho local được ghi rõ.

## 10. Backend test plan

### Unit

- Date validation.
- Permission policy.
- Rule matching, quantity và dedupe.
- Error mapping.

### Integration với database thật

- Create trip + owner membership atomic.
- Join invite valid/expired/revoked/maxUses.
- Duplicate join idempotency.
- Cascade delete.
- Apply suggestions atomic.
- Concurrent/stale version conflict nếu bật versioning.
- Suspended user bị chặn.

### API/e2e

- Register/login/refresh/logout.
- Member không sửa trip ngoài membership.
- Member không thực hiện owner action.
- Admin route từ chối USER.
- OpenAPI/error shape.

Không mock database cho test transaction quan trọng.

## 11. Backend acceptance gate

Backend được xem là sẵn sàng tích hợp khi:

- Migration + seed chạy trên database sạch.
- Health endpoint pass.
- Auth session lifecycle pass.
- Permission matrix có integration test.
- Join flow pass cả invalid/expired/revoked.
- Checklist CRUD và apply suggestion transaction pass.
- OpenAPI JSON được sinh và commit/publish theo quy ước.
- Không có secret trong repository.
- Log có request ID và không lộ credential.

## 12. Tài liệu chính thức

- [NestJS authentication](https://docs.nestjs.com/security/authentication)
- [NestJS OpenAPI](https://docs.nestjs.com/openapi/introduction)
- [NestJS OpenAPI security](https://docs.nestjs.com/openapi/security)
- [Prisma PostgreSQL](https://www.prisma.io/docs/orm/core-concepts/supported-databases/postgresql)
- [Prisma migrations](https://www.prisma.io/docs/orm/migrations/how-migrations-work)
- [Prisma transactions](https://www.prisma.io/docs/orm/fundamentals/transactions)
- [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
