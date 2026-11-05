# 02 — Kiến trúc đích

## 1. Bức tranh tổng thể

~~~text
┌────────────────────┐       HTTPS / JSON       ┌─────────────────────────┐
│ Expo mobile        │ ───────────────────────> │ NestJS REST API         │
│ Android + iOS      │                          │ Modular monolith        │
└────────────────────┘                          └────────────┬────────────┘
                                                          │
┌────────────────────┐       HTTPS / JSON                  │ transaction
│ React admin web    │ ───────────────────────────────────>│
└────────────────────┘                          ┌────────────▼────────────┐
                                              │ PostgreSQL              │
                                              └─────────────────────────┘
                                                          │
                                              ┌────────────▼────────────┐
                                              │ Open-Meteo              │
                                              └─────────────────────────┘
~~~

Một API phục vụ cả mobile và admin. Authorization khác nhau theo route/role, không tách thành
hai backend.

## 2. Kiểu kiến trúc

Backend dùng modular monolith:

- Một process deploy.
- Một PostgreSQL database.
- Module boundaries rõ.
- Giao dịch xuyên bảng đơn giản.
- Dễ demo, debug và giải thích hơn microservices.

Chỉ cân nhắc tách service khi có bằng chứng về tải, ownership team hoặc lifecycle triển khai
khác nhau. MVP không có bằng chứng đó.

## 3. Cấu trúc repository đích

Trong quá trình chuyển đổi, giữ Android hiện tại ở nguyên vị trí. Thêm workspace v2 song song:

~~~text
luckgage/
├── app/                         # Android Compose legacy trong giai đoạn migration
├── apps/
│   ├── mobile/                  # Expo
│   ├── api/                     # NestJS
│   └── admin/                   # React + Vite
├── packages/
│   ├── domain/                  # Pure TS rules/types không phụ thuộc platform
│   ├── api-client/              # Generated hoặc typed client từ OpenAPI
│   └── design-tokens/           # Semantic tokens, không chứa component
├── docs/fullstack-migration/
└── PROJECT_SPEC_FULLSTACK_EDITION.md
~~~

Không di chuyển hoặc xóa thư mục Android khi Expo chưa đạt parity gate. Sau cutover, tạo tag
legacy rõ ràng rồi mới quyết định archive.

## 4. Boundary của shared packages

### packages/domain

Được chứa:

- Enum và value object thuần TypeScript.
- Calendar-date validation.
- Checklist progress.
- Pure rule matching/evaluation nếu cả mobile-local và backend cần dùng.
- Không chứa React, Expo, NestJS, Prisma hoặc fetch.

Không được chứa:

- Database entity.
- HTTP DTO gắn với auth.
- UI state.
- Secret/config môi trường.

### packages/api-client

- Sinh hoặc cập nhật từ OpenAPI.
- Chứa request/response contract và client wrapper.
- Không chứa UI toast/navigation.
- Mobile và admin dùng cùng error normalization.

### packages/design-tokens

- Semantic color, spacing, radius, typography scale.
- Mobile và web có adapter riêng.
- Không ép dùng chung component giữa React Native và DOM.

## 5. Mobile architecture

~~~text
Route
  -> Screen
      -> Feature hook / reducer
          -> Repository / API client
              -> Expo SQLite hoặc REST API
~~~

### State ownership

| Loại state | Nơi giữ |
|---|---|
| Server data: trips, members, checklist | Query cache/API layer |
| Form editing: input chưa save | Screen reducer/form hook |
| UI framework: sheet, focus, scroll | Component gần nhất |
| Durable preference | Preference storage |
| Token/refresh credential | SecureStore |
| One-shot navigation/toast | Handler/effect gần route |

Không tạo một global store duy nhất chứa toàn bộ app. Server state, editing state và UI state có
lifecycle khác nhau.

### Repository transition

- Phase 1: repository implementation dùng Expo SQLite/direct Open-Meteo.
- Phase 3: implementation dùng REST API.
- Sau ổn định: SQLite chỉ giữ cache tối thiểu nếu có yêu cầu offline đọc.
- MVP không có offline mutation queue.

## 6. Backend modules

~~~text
App
├── AuthModule
├── UsersModule
├── TripsModule
├── MembershipsModule
├── ChecklistsModule
├── PackingSuggestionsModule
├── TripSuggestionsModule
├── WeatherModule
├── AdminModule
├── DatabaseModule
└── ObservabilityModule
~~~

Quy tắc dependency:

- Controller parse/validate HTTP và gọi application service.
- Service thực hiện use case, permission và transaction.
- Repository/data access chỉ truy cập database.
- Không trả Prisma model trực tiếp ra API.
- Module không đọc bảng của module khác một cách tùy ý; dùng service được export hoặc transaction
  coordinator rõ ràng.
- Không tạo lớp use-case cho mỗi hàm CRUD nhỏ nếu service đã đủ rõ.

## 7. Data ownership theo phase

| Phase | Trip/checklist source of truth | Auth | Suggestions |
|---|---|---|---|
| Expo local | Expo SQLite | Không có | Pure local rules |
| Backend độc lập | PostgreSQL cho API test | Server | Server managed rules |
| Tích hợp | PostgreSQL | Server | Server preview/apply |
| Admin | PostgreSQL | Server + admin role | Admin CRUD/publish |

Giai đoạn tích hợp là điểm chuyển ownership. Không để app vừa ghi SQLite vừa ghi server như hai
nguồn độc lập.

## 8. Auth architecture

### Mobile

- Login nhận access token ngắn hạn và refresh credential.
- Access token giữ trong memory khi có thể.
- Refresh credential lưu SecureStore.
- API client thực hiện một refresh có điều phối khi gặp token hết hạn; không tạo refresh storm.
- Logout thu hồi session server và xóa local credential.

### Admin web

- Ưu tiên secure, HttpOnly, SameSite cookie cho phiên web.
- CSRF protection áp dụng cho request thay đổi dữ liệu nếu dùng cookie auth.
- Admin route kiểm tra role ở server; ẩn menu phía client chỉ là UX.

### Permission

Mỗi trip/checklist request phải kiểm tra:

1. User đang active.
2. User có membership active với trip.
3. Hành động có yêu cầu owner hay chỉ member.

Không suy luận permission chỉ từ việc user biết trip ID.

## 9. Sync và concurrency

MVP dùng REST + invalidation:

1. User mutation gửi request.
2. Server commit transaction.
3. Client cập nhật optimistic chỉ cho thao tác dễ rollback như toggle item.
4. Client refetch phần liên quan sau mutation.
5. Khi app foreground lại, refetch trip đang mở.

Không dùng polling liên tục mặc định. Có pull-to-refresh và refetch theo lifecycle.

Để hạn chế ghi đè:

- Trip và checklist item có version integer hoặc updatedAt dùng cho optimistic concurrency.
- Update gửi version hiện tại.
- Server trả 409 conflict nếu stale.
- Client báo dữ liệu đã thay đổi và refetch; không silently overwrite.

Nếu concurrency bị cắt khỏi MVP, phải ghi rõ last-write-wins trong spec và demo, không giả rằng
đã xử lý conflict.

## 10. Error model

### Nội bộ backend

- Validation error.
- Authentication error.
- Authorization error.
- Not found.
- Conflict.
- External service unavailable.
- Unexpected internal error.

### HTTP boundary

API trả problem object ổn định:

~~~json
{
  "status": 409,
  "code": "CHECKLIST_ITEM_VERSION_CONFLICT",
  "title": "Dữ liệu đã thay đổi",
  "detail": "Vui lòng tải lại checklist trước khi sửa tiếp.",
  "requestId": "req_...",
  "fieldErrors": []
}
~~~

Client map theo code; không parse message để điều khiển logic.

### External weather

- Timeout/failure được map thành weather unavailable.
- Không biến thành trip load failure.
- Cache hợp lệ có thể trả cùng metadata stale/fetchedAt.

## 11. Transaction boundaries bắt buộc

- Register user và auth session nếu tạo cùng lúc.
- Create trip và owner membership.
- Join trip, validate invite và increment usage.
- Delete trip và dữ liệu phụ thuộc.
- Apply packing suggestions.
- Publish rule version nếu ghi nhiều bảng.

Không gọi Open-Meteo hoặc service mạng bên ngoài khi đang giữ database transaction.

## 12. Deployment topology tối giản

### Local

~~~text
Expo dev client -> API localhost/LAN -> PostgreSQL container
Admin dev server -> API localhost -> PostgreSQL container
~~~

### Demo/staging

~~~text
Expo development/release build
React static hosting
NestJS container/service
Managed hoặc containerized PostgreSQL
HTTPS
~~~

Không đặt database public ra Internet. API là cổng duy nhất tới dữ liệu.

## 13. Môi trường

Tối thiểu:

- local
- test
- demo/staging

Mỗi môi trường có database riêng. Seed demo không được chạy nhầm vào production. Mobile API base
URL là config build, không hard-code rải rác.

## 14. Trade-off đã chấp nhận

| Lựa chọn | Lợi ích | Chi phí |
|---|---|---|
| Expo | Tốc độ phát triển, cross-platform | Một số capability cần development build |
| NestJS | Module/DI/OpenAPI rõ để bảo vệ | Học thêm framework backend |
| PostgreSQL | Quan hệ/transaction phù hợp | Cần deploy database |
| REST | Dễ demo và inspect | Có nhiều endpoint/DTO |
| No realtime MVP | Giảm đáng kể scope | Member không thấy thay đổi tức thì |
| Server source of truth | Join/cộng tác nhất quán | Core flow cần mạng sau tích hợp |
| New UI | Sản phẩm đặc sắc hơn | Không tận dụng trực tiếp Compose layout |

## 15. Architecture gate

Trước khi code backend:

- Spike Expo workspace import cho packages/domain.
- Spike NestJS + PostgreSQL migration.
- Chốt auth transport cho mobile và web.
- Chốt concurrency policy.
- Chốt host demo và HTTPS.
- Vẽ ERD cuối từ tài liệu backend/data.
