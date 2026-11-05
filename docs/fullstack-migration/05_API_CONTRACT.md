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
- GET /admin/me

Login thành công set secure HttpOnly session cookie. Mutating admin request phải tuân theo CSRF
policy đã chốt. Endpoint bên dưới luôn kiểm tra role ADMIN phía server.

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
  "code": "LUCK-8K4M",
  "expiresAt": "2026-11-06T09:30:00Z",
  "maxUses": 5,
  "useCount": 0
}
~~~

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

## 10. Admin API

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

### Trip suggestions

- GET /admin/trip-suggestions
- POST /admin/trip-suggestions
- GET /admin/trip-suggestions/{id}
- PATCH /admin/trip-suggestions/{id}
- POST /admin/trip-suggestions/{id}/publish
- POST /admin/trip-suggestions/{id}/archive

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

## 11. Rate/size limits

Giới hạn cụ thể được benchmark, tối thiểu phải có:

- Login/register/refresh/join: rate limit theo IP và identifier phù hợp.
- Trip note/checklist note: max length.
- Apply suggestions: max category/item count mỗi request.
- Search query: max length.
- pageSize: max 100.
- Không nhận base64 image trong JSON; admin dùng URL hoặc upload flow riêng khi được chốt.

## 12. OpenAPI workflow

1. Backend annotation/schema sinh OpenAPI JSON.
2. CI validate spec.
3. Sinh api-client cho mobile/admin hoặc kiểm tra type wrapper.
4. Breaking diff phải được review.
5. Client không copy-paste DTO thủ công nếu có generated contract.

OpenAPI là contract transport; domain/UI model vẫn được map riêng.

## 13. Contract test checklist

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
