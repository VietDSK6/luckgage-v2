# 05 — Hợp đồng REST API

## 1. Mục tiêu

API contract là ranh giới giữa mobile, admin và backend. Client không phụ thuộc Prisma model hoặc
database column. Mọi thay đổi breaking phải cập nhật OpenAPI và client trước khi merge.

Base path:

~~~text
/api/v1
~~~

## 2. Convention

### Format

- JSON dùng camelCase.
- ID là UUID string.
- Calendar date: YYYY-MM-DD.
- Timestamp: ISO-8601 UTC, ví dụ 2026-11-05T09:30:00Z.
- Null dùng khi field có nghĩa “đã biết là không có”; field optional dùng khi request không thay
  đổi field đó.
- Không trả passwordHash, tokenHash hoặc codeHash.

### Status

| Status | Dùng cho |
|---:|---|
| 200 | Read/update thành công |
| 201 | Create thành công |
| 204 | Delete/logout thành công, không body |
| 400 | Request sai định dạng hoặc rule input |
| 401 | Chưa xác thực/token sai |
| 403 | Đã xác thực nhưng không có quyền |
| 404 | Resource không tồn tại hoặc không được phép biết tồn tại |
| 409 | Duplicate/conflict/stale version |
| 422 | Field validation có cấu trúc nếu team chọn tách khỏi 400 |
| 429 | Rate limited |
| 503 | External dependency tạm unavailable |

Chốt dùng 400 hoặc 422 cho validation trước khi implement và dùng nhất quán. Mặc định tài liệu
này dùng 422.

### Error shape

~~~json
{
  "status": 422,
  "code": "VALIDATION_FAILED",
  "title": "Dữ liệu chưa hợp lệ",
  "detail": "Vui lòng kiểm tra các trường được đánh dấu.",
  "requestId": "req_01J...",
  "fieldErrors": [
    {
      "field": "endDate",
      "code": "END_DATE_BEFORE_START_DATE",
      "message": "Ngày kết thúc không được trước ngày bắt đầu."
    }
  ]
}
~~~

Client điều khiển hành vi theo code, không theo message. Message là fallback và có thể được
localize ở client.

### Pagination

Admin list và trip suggestions dùng:

~~~text
?page=1&pageSize=20&search=danang&sort=-createdAt
~~~

Response:

~~~json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "totalItems": 0,
  "totalPages": 0
}
~~~

pageSize được server giới hạn, mặc định 20, tối đa 100.

## 3. Authentication

### Mobile bearer flow

#### POST /auth/register

Request:

~~~json
{
  "email": "mai@example.com",
  "password": "user-supplied-password",
  "displayName": "Mai",
  "locale": "vi"
}
~~~

Response 201:

~~~json
{
  "user": {
    "id": "uuid",
    "email": "mai@example.com",
    "displayName": "Mai",
    "role": "USER",
    "status": "ACTIVE",
    "locale": "vi"
  },
  "accessToken": "opaque-or-jwt-access-token",
  "accessTokenExpiresAt": "2026-11-05T10:00:00Z",
  "refreshToken": "one-time-visible-refresh-token",
  "refreshTokenExpiresAt": "2026-12-05T09:30:00Z"
}
~~~

#### POST /auth/login

Request email/password; response cùng auth payload.

#### POST /auth/refresh

Request:

~~~json
{
  "refreshToken": "stored-in-mobile-secure-store"
}
~~~

Server rotate refresh token. Token cũ không được dùng lại.

#### POST /auth/logout

Thu hồi session hiện tại. Response 204.

#### GET /me

Trả current user profile.

#### PATCH /me

MVP cho sửa displayName, locale. Không cho sửa role/status.

### Admin session flow

- POST /admin/auth/login
- POST /admin/auth/logout
- GET /admin/auth/me

Login thành công set secure HttpOnly session cookie. Mutating admin request phải tuân theo CSRF
policy đã chốt. Login và `GET /admin/auth/me` cùng trả `{ user, csrfToken }`; token CSRF chỉ giữ
trong memory của admin web và được khôi phục lại sau reload, còn session token không rời HttpOnly
cookie. Endpoint bên dưới luôn kiểm tra role ADMIN phía server.

#### GET /admin/dashboard

Trả aggregate tại thời điểm request: tổng/active/suspended user, tổng trip, trip đang diễn ra theo
calendar date UTC hiện tại, lượt join trong 7 ngày gần nhất, số packing rule published và số trip
suggestion published. Response có `generatedAt`; không trả dữ liệu checklist hoặc note riêng tư.

#### GET /admin/users

Query hỗ trợ `page`, `pageSize`, `search`, `role`, `status` và `sort`. `search` match email hoặc tên
hiển thị không phân biệt hoa thường. Response theo pagination envelope chuẩn và không chứa password,
token hoặc session credential.

#### GET /admin/users/{userId}

Trả profile quản trị cùng `ownedTripCount`, `activeMembershipCount`, `activeSessionCount` và
`lastSessionActivityAt`. Session metadata chỉ là aggregate/thời điểm; không trả token hash.

#### PATCH /admin/users/{userId}/status

Request `{ "status": "ACTIVE" | "SUSPENDED" }`, bắt buộc CSRF. Suspend thu hồi mọi session còn
hiệu lực nhưng không xóa dữ liệu. Admin không thể tự suspend tài khoản đang dùng.

## 4. Trip endpoints

### GET /trips

Query optional:

- status=upcoming|active|past
- page/pageSize nếu cần.

Chỉ trả trip user có active membership.

List item:

~~~json
{
  "id": "uuid",
  "name": "Đà Nẵng 4 ngày",
  "destination": {
    "label": "Đà Nẵng, Việt Nam",
    "countryCode": "VN"
  },
  "startDate": "2026-12-10",
  "endDate": "2026-12-13",
  "tripType": "BEACH",
  "timelineStatus": "UPCOMING",
  "daysUntilStart": 35,
  "checklistProgress": {
    "packedItems": 7,
    "totalItems": 12,
    "percentage": 58
  },
  "memberPreview": [],
  "currentUserRole": "OWNER",
  "version": 3,
  "updatedAt": "2026-11-05T09:30:00Z"
}
~~~

### POST /trips

Request:

~~~json
{
  "name": "Đà Nẵng 4 ngày",
  "destination": {
    "label": "Đà Nẵng, Việt Nam",
    "providerPlaceId": "provider-id",
    "latitude": 16.0678,
    "longitude": 108.2208,
    "timezone": "Asia/Ho_Chi_Minh",
    "countryCode": "VN",
    "adminArea": "Đà Nẵng",
    "country": "Việt Nam"
  },
  "startDate": "2026-12-10",
  "endDate": "2026-12-13",
  "tripType": "BEACH",
  "note": "Nghỉ dưỡng cùng nhóm"
}
~~~

Server transaction tạo trip và owner membership. Response 201 là TripDetail.

### GET /trips/{tripId}

Trả:

- Trip detail.
- currentUserRole.
- checklist progress.
- members summary.
- weather summary tách state.

Không trả toàn bộ checklist; dùng endpoint riêng.

### PATCH /trips/{tripId}

Owner-only trong MVP.

Request chỉ gồm field cần đổi và version:

~~~json
{
  "name": "Đà Nẵng cuối năm",
  "version": 3
}
~~~

Stale version trả 409 TRIP_VERSION_CONFLICT.

### DELETE /trips/{tripId}

Owner-only. Response 204.

## 5. Membership và join

### GET /trips/{tripId}/members

Member được xem danh sách tối thiểu:

- userId.
- displayName.
- avatar URL nếu có.
- role.
- joinedAt.

Không trả email cho member nếu không có yêu cầu sản phẩm.

### POST /trips/{tripId}/invites

Owner-only.

Request:

~~~json
{
  "expiresInHours": 24,
  "maxUses": 5
}
~~~

Response 201 chỉ là lần raw code được trả:

~~~json
{
  "id": "uuid",
  "code": "LUCK-8K4M2P7Q",
  "expiresAt": "2026-11-06T09:30:00Z",
  "maxUses": 5,
  "useCount": 0
}
~~~

Mobile có thể render QR từ chuỗi `code` trong response này. Camera trong app chỉ nhận QR chứa
đúng định dạng join code; sau quét, mobile gửi code qua cùng endpoint preview/join bên dưới. Không
có endpoint, token, link mời hoặc quyền mới cho QR.

### DELETE /trips/{tripId}/invites/{inviteId}

Owner-only, revoke invite. Response 204.

### POST /trip-invites/preview

Code nằm trong body để tránh xuất hiện trong URL/access log.

~~~json
{
  "code": "LUCK-8K4M"
}
~~~

Response:

~~~json
{
  "tripId": "uuid",
  "tripName": "Đà Nẵng 4 ngày",
  "destinationLabel": "Đà Nẵng, Việt Nam",
  "startDate": "2026-12-10",
  "endDate": "2026-12-13",
  "ownerDisplayName": "Mai",
  "memberCount": 2,
  "expiresAt": "2026-11-06T09:30:00Z"
}
~~~

### POST /trip-invites/join

Request code. Response 200 TripDetail.

Error codes:

- INVITE_INVALID
- INVITE_EXPIRED
- INVITE_REVOKED
- INVITE_MAX_USES_REACHED
- USER_ALREADY_MEMBER

USER_ALREADY_MEMBER có thể trả 200 kèm trip thay vì 409 để flow idempotent; chọn một behavior và
test nhất quán. Mặc định: 200.

### DELETE /trips/{tripId}/members/{userId}

Owner-only. Không cho xóa owner. Response 204.

## 6. Checklist endpoints

### GET /trips/{tripId}/checklist

~~~json
{
  "tripId": "uuid",
  "progress": {
    "packedItems": 1,
    "totalItems": 2,
    "percentage": 50
  },
  "categories": [
    {
      "id": "uuid",
      "name": "Giấy tờ",
      "position": 0,
      "version": 1,
      "items": [
        {
          "id": "uuid",
          "name": "Hộ chiếu",
          "quantity": 1,
          "isPacked": true,
          "note": null,
          "position": 0,
          "version": 2,
          "createdAt": "2026-11-05T09:30:00Z",
          "updatedAt": "2026-11-05T09:31:00Z"
        }
      ]
    }
  ]
}
~~~

### POST /trips/{tripId}/checklist/categories

Request name và optional position. Response 201 category.

### PATCH /checklist-categories/{categoryId}

Request name/position/version.

### DELETE /checklist-categories/{categoryId}

Nếu category có item, client phải confirm; server vẫn authorize. Response 204.

### POST /checklist-categories/{categoryId}/items

Request:

~~~json
{
  "name": "Kem chống nắng",
  "quantity": 1,
  "note": "SPF 50"
}
~~~

### PATCH /checklist-items/{itemId}

Cho phép name, quantity, note, isPacked, position và version.

Toggle nhanh vẫn gửi version để phát hiện stale update.

### DELETE /checklist-items/{itemId}

Response 204. Undo ở client tạo lại item mới hoặc dùng endpoint restore nếu sản phẩm thật sự cần;
MVP có thể giữ payload tạm và POST lại.

### PATCH /checklist-categories/{categoryId}/packed-state

Request:

~~~json
{
  "isPacked": true
}
~~~

Server update toàn category trong transaction và trả progress mới.

## 7. Packing suggestions

### POST /trips/{tripId}/packing-suggestions/preview

Request:

~~~json
{
  "activities": ["swimming"],
  "notes": "Có trẻ nhỏ",
  "locale": "vi"
}
~~~

Response:

~~~json
{
  "source": "RULE_BASED",
  "sourceLabel": "Gợi ý theo quy tắc và dự báo thời tiết",
  "generatedAt": "2026-11-05T09:30:00Z",
  "weatherStatus": "FRESH",
  "categories": [
    {
      "clientKey": "documents",
      "name": "Giấy tờ",
      "items": [
        {
          "clientKey": "documents:photo-id",
          "name": "Giấy tờ tùy thân có ảnh",
          "quantity": 1,
          "note": null,
          "reason": "Vật dụng cơ bản cho mọi chuyến đi",
          "matchedRules": [
            {
              "ruleId": "uuid",
              "version": 2
            }
          ]
        }
      ]
    }
  ]
}
~~~

Preview không ghi database.

### POST /trips/{tripId}/packing-suggestions/apply

Request là snapshot user đã chỉnh:

~~~json
{
  "categories": [
    {
      "name": "Giấy tờ",
      "items": [
        {
          "name": "CCCD",
          "quantity": 1,
          "note": "Bản gốc"
        }
      ]
    }
  ]
}
~~~

Server:

- Validate membership.
- Validate size/text/quantity.
- Tạo category mới hoặc append theo policy.
- Không sửa item cũ.
- Commit toàn bộ hoặc rollback toàn bộ.

Response 201:

~~~json
{
  "addedCategoryCount": 1,
  "addedItemCount": 1,
  "checklistProgress": {
    "packedItems": 1,
    "totalItems": 3,
    "percentage": 33
  }
}
~~~

Policy category:

- Nếu tên normalized trùng category hiện có, append vào category đó.
- Nếu không, tạo category cuối danh sách.
- Item trùng tên vẫn được phép; không tự dedupe dữ liệu user đã xác nhận.

## 8. Location và weather

### GET /locations/search?q=Da%20Nang&locale=vi

Server proxy/mapping Open-Meteo. Query tối thiểu 2–3 ký tự và rate limited/cache ngắn.

### GET /trips/{tripId}/weather

Response có state:

~~~json
{
  "status": "CACHED",
  "fetchedAt": "2026-11-05T08:00:00Z",
  "daily": []
}
~~~

status:

- FRESH
- CACHED
- UNAVAILABLE

UNAVAILABLE có thể trả 200 với daily rỗng để Trip Detail vẫn là success. Chỉ trả 503 khi client
gọi weather như một tài nguyên độc lập và cần phân biệt failure kỹ thuật.

## 9. Trip suggestions user API

### GET /trip-suggestions

Chỉ published, có pagination/tag/search.

### GET /trip-suggestions/{slug}

Trả localized content và prefill object:

~~~json
{
  "id": "uuid",
  "slug": "da-nang-weekend",
  "title": "Cuối tuần ở Đà Nẵng",
  "summary": "Biển, đồ ăn và hành lý gọn nhẹ.",
  "image": {
    "url": "https://...",
    "alt": "Bãi biển Đà Nẵng"
  },
  "tags": ["beach", "weekend"],
  "tripPrefill": {
    "destination": {},
    "tripType": "BEACH",
    "suggestedDurationDays": 3
  }
}
~~~

Không tự tạo trip khi mở suggestion.

## 10. Luki guides API — Phase 4E

`GET /guides?locale=vi&page=1&pageSize=20` chỉ trả published, không trả sections. `GET
/guides/{slug}?locale=vi` trả nội dung localized, sections và `isSaved` theo user. `GET
/guides/saved?locale=vi` trả bài đã lưu còn published. `PUT /guides/{slug}/save` và `DELETE
/guides/{slug}/save` là idempotent, yêu cầu bearer token. Bookmark gắn user/article, không dùng
local-only storage. Khi article archived, public detail trả 404 và bài không còn trong saved list.

Admin cookie + CSRF dùng `GET/POST /admin/guides`, `GET/PATCH /admin/guides/{id}`,
`POST /admin/guides/{id}/publish`, `POST /admin/guides/{id}/archive` và
`DELETE /admin/guides/{id}` cho draft/archived. Article có slug duy nhất,
title/summary/cover URL + alt VI/EN, tags, sortOrder, optional `tripSuggestionId`, sections VI/EN.
Section là discriminated union: `heading {text}`, `paragraph {text}`, `image {url,alt}`,
`bulletList {items}` hoặc `callout {text}`; tối đa 30 sections/ngôn ngữ. Không nhận HTML/WebView.
Publish yêu cầu cả hai ngôn ngữ có section hợp lệ. Published PATCH thay đổi public ngay; archived
read-only. Public detail chỉ trả `relatedSuggestionSlug` nếu suggestion còn published.
Xóa vĩnh viễn một draft/archived guide cũng xóa các bookmark của bài đó.

## 11. Admin API

### Users

- GET /admin/users
- GET /admin/users/{userId}
- PATCH /admin/users/{userId}/status

Không có endpoint đổi password người khác trong MVP.

### Packing rules

- GET /admin/packing-rules
- POST /admin/packing-rules
- GET /admin/packing-rules/{ruleId}
- PATCH /admin/packing-rules/{ruleId}
- POST /admin/packing-rules/{ruleId}/preview
- POST /admin/packing-rules/{ruleId}/publish
- POST /admin/packing-rules/{ruleId}/archive

Published rule không sửa trực tiếp làm thay đổi lịch sử. Edit tạo draft/version tiếp theo hoặc
backend copy thành editable revision.

Trạng thái Phase 4C:

- List trả mọi revision theo `key` và version giảm dần để admin nhìn được lịch sử.
- Create luôn tạo `DRAFT` ở version kế tiếp của `key`.
- PATCH một `DRAFT` cập nhật tại chỗ; PATCH một `PUBLISHED` tạo `DRAFT` version mới và giữ nguyên
  revision đang chạy trên mobile; `ARCHIVED` là read-only.
- Preview nhận sample trip đầy đủ (`tripType`, `durationDays`, activities, weather, locale), chỉ đọc
  đúng revision được chọn và không ghi checklist.
- Publish chỉ nhận `DRAFT`, đồng thời archive revision published trước đó cùng key trong transaction.
- Archive loại revision khỏi rule set mà mobile sử dụng; checklist đã áp dụng trước đó không đổi.
- Mọi mutation admin bắt buộc cookie ADMIN, `x-csrf-token`, Problem Details và request ID như contract
  auth chung.

### Trip suggestions

- GET /admin/trip-suggestions
- POST /admin/trip-suggestions
- GET /admin/trip-suggestions/{id}
- PATCH /admin/trip-suggestions/{id}
- POST /admin/trip-suggestions/{id}/publish
- POST /admin/trip-suggestions/{id}/archive

Trạng thái Phase 4D:

- Create tạo `DRAFT`; chỉ `PUBLISHED` xuất hiện ở hai endpoint user.
- PATCH cập nhật draft hoặc published suggestion; nếu đang published thì nội dung mới có hiệu lực
  ngay trên mobile. UI admin cảnh báo rõ vì suggestion chưa version hóa.
- `ARCHIVED` là read-only và PATCH trả 409; archive loại nội dung khỏi list/detail user.
- Publish/archive và mọi write khác bắt buộc cookie ADMIN cùng `x-csrf-token`.
- Destination metadata dùng cùng transport shape với trip prefill; ảnh chỉ nhận URL `http(s)` và alt
  song ngữ, không nhận base64 JSON.

### Trips support và destination lookup

- GET /admin/trips
- GET /admin/locations/search

`GET /admin/trips` nhận `search`, `status=UPCOMING|ACTIVE|PAST`, `page`, `pageSize`; search áp dụng
cho tên chuyến đi, điểm đến và display name của owner. Response chỉ gồm ID/name/destination/date,
trip type/timeline status, owner display name, member count, checklist progress aggregate cùng
created/updated time. Không trả trip note, category hoặc checklist item.

`GET /admin/locations/search` dùng provider location hiện có để editorial form lấy tọa độ/timezone;
weather/provider lỗi không làm thay đổi trip suggestion đã nhập thủ công.

### Dashboard

- GET /admin/dashboard/summary

Trả aggregate không chứa checklist content:

- totalUsers.
- activeUsers.
- totalTrips.
- activeTrips.
- joinsLast7Days.
- publishedRules.
- publishedTripSuggestions.

## 12. Rate/size limits

Giới hạn cụ thể được benchmark, tối thiểu phải có:

- Login/register/refresh/join: rate limit theo IP và identifier phù hợp.
- Trip note/checklist note: max length.
- Apply suggestions: max category/item count mỗi request.
- Search query: max length.
- pageSize: max 100.
- Không nhận base64 image trong JSON; admin dùng URL hoặc upload flow riêng khi được chốt.

## 13. OpenAPI workflow

1. Backend annotation/schema sinh OpenAPI JSON.
2. CI validate spec.
3. Sinh api-client cho mobile/admin hoặc kiểm tra type wrapper.
4. Breaking diff phải được review.
5. Client không copy-paste DTO thủ công nếu có generated contract.

OpenAPI là contract transport; domain/UI model vẫn được map riêng.

## 14. Contract test checklist

- Error shape giống nhau giữa modules.
- Unauthorized là 401; insufficient permission là 403/404 theo policy.
- Date không đổi timezone.
- Null/optional đúng.
- Admin USER bị chặn.
- Member ngoài trip không đọc checklist.
- Preview không tạo record.
- Apply append atomic.
- Join code không xuất hiện trong log/URL.
- Stale version trả 409.
- OpenAPI phản ánh status/payload thực tế.
