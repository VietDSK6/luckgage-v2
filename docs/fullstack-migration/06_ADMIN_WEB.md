# 06 — Web quản trị

## 1. Mục tiêu

Admin web giúp quản trị nội dung và tài khoản mà không cần thao tác trực tiếp database. Đây không
phải bản desktop của mobile và không cần sao chép visual language một cách máy móc.

Ưu tiên:

1. Dữ liệu rõ.
2. Form an toàn.
3. Preview trước publish.
4. Permission và audit.
5. Responsive đủ dùng trên laptop/tablet.

## 2. Vai trò

MVP có một role ADMIN. User thường không được truy cập admin shell hoặc admin API.

Admin được:

- Xem/tìm/filter user.
- Suspend/reactivate.
- Quản lý packing rules.
- Quản lý trip suggestions.
- Xem dashboard aggregate.

Admin không mặc định được:

- Xem password/token/join code.
- Sửa checklist cá nhân.
- Đăng nhập giả user.
- Xóa hàng loạt user/trip.
- Đổi owner trip.

## 3. Route map

~~~text
/login
/dashboard
/users
/users/:userId
/packing-rules
/packing-rules/new
/packing-rules/:ruleId
/trip-suggestions
/trip-suggestions/new
/trip-suggestions/:suggestionId
/trips
/audit                         # Phase 4 nếu triển khai
~~~

## 4. App shell

- Sidebar: Dashboard, Users, Packing Rules, Trip Suggestions, Trips.
- Top bar: breadcrumb, environment badge, admin menu.
- Main content max width phù hợp table/form.
- Mobile layout không phải ưu tiên chính nhưng vẫn không vỡ.
- Environment demo/staging phải nhìn thấy để tránh thao tác nhầm.

Visual:

- Dùng cùng semantic color/token với mobile.
- Giảm illustration và decorative shape.
- Table/form là trọng tâm.
- Accent coral chỉ cho highlight, không dùng cho mọi button.

## 5. Dashboard

Cards:

- Total users.
- Active/suspended users.
- Total/active trips.
- Joins 7 ngày.
- Published packing rules.
- Published trip suggestions.

Không xây chart chỉ để lấp chỗ trống. Chỉ thêm chart nếu có câu hỏi quản trị rõ, ví dụ xu hướng
join theo ngày.

Recent activity:

- Rule published.
- Suggestion published.
- User suspended/reactivated.

Dashboard error không chặn navigation tới module khác.

## 6. User management

### List

- Search email/display name.
- Filter status/role.
- Pagination server-side.
- Columns: display name, masked/visible email theo policy, role, status, createdAt, lastLoginAt.
- Row action: view, suspend/reactivate.

### Detail

- Basic profile.
- Account status.
- Aggregate trip count/membership count.
- Auth/session metadata tối thiểu, không token.
- Admin activity liên quan.

Suspend flow:

- Confirm dialog nói rõ hậu quả.
- Optional reason ngắn nếu audit được triển khai.
- Không xóa dữ liệu.
- Sau success, cập nhật row/detail ngay.

## 7. Packing rule management

Đây là trang quan trọng nhất của admin.

### List

- Status: Draft, Published, Archived.
- Key/name/version/priority.
- Condition summary.
- Updated/published time.
- Actions theo status.

### Editor

Chia thành section:

1. Identity: key, name, priority.
2. Conditions: trip type, day range, temperature, rain, activity.
3. Output items: category, localized name, quantity mode, base quantity, reason.
4. Preview.
5. Publish.

Không cho nhập JSON hoặc code trực tiếp.

Validation:

- min không lớn hơn max.
- rain 0–100.
- quantity >= 1.
- required localized field theo policy.
- stable key đúng format.
- ít nhất một output item.

### Preview panel

Admin nhập sample trip:

- Type.
- Duration.
- Weather.
- Activities.
- Locale.

Panel hiển thị:

- Rule có match không.
- Items được tạo.
- Reason.
- Dedupe/quantity sau hợp nhất nếu preview toàn rule set.

Publish cần confirm và hiển thị version mới. Published revision không sửa trực tiếp.

## 8. Trip suggestion management

### List

- Thumbnail.
- Localized title.
- Destination.
- Status.
- Sort order.
- Updated/published time.

### Editor

- titleVi/titleEn.
- summaryVi/summaryEn.
- destination search/prefill.
- image URL và alt text.
- tags.
- suggested trip type/duration.
- preview mobile card.

Không upload base64 vào API JSON. Nếu chưa có media service, dùng URL được validate và demo asset
ổn định.

Publish requirements:

- Có title/summary/destination.
- Có image alt nếu có image.
- Preview không overflow tiếng Việt/Anh.

## 9. Trips support view

MVP chỉ cần:

- Trip ID/name/destination/date.
- Owner display name.
- Member count.
- Checklist progress aggregate.
- Created/updated time.

Không mở checklist item detail mặc định. Mục đích là chứng minh quản lý/quan sát hệ thống, không
biến admin thành công cụ đọc dữ liệu riêng tư.

## 10. Frontend architecture

~~~text
apps/admin/src/
├── app/
│   ├── router/
│   ├── auth/
│   └── layout/
├── features/
│   ├── dashboard/
│   ├── users/
│   ├── packing-rules/
│   ├── trip-suggestions/
│   └── trips/
├── design/
├── api/
└── i18n/
~~~

Nguyên tắc:

- Route/page không gọi fetch rải rác.
- API client dùng contract chung.
- Server data dùng query/mutation cache.
- Form draft nằm trong form state.
- Table filter phản ánh trên URL query để refresh/share được.
- Không đặt permission logic chỉ ở router client.

## 11. Form behavior

- Dirty form cảnh báo khi rời trang.
- Save draft và publish là hai hành động khác.
- Mutation loading chỉ disable phần liên quan.
- Field error hiển thị gần field.
- Server conflict giữ lại input và cho reload/compare.
- Destructive/archive có confirm.
- Không confirm cho save draft thông thường.

## 12. Accessibility và responsive

- Keyboard navigation đầy đủ.
- Focus visible.
- Label thật cho form, không chỉ placeholder.
- Dialog trap focus và trả focus đúng.
- Table có caption/header semantics.
- Status có text + icon, không chỉ màu.
- Contrast phù hợp.
- Ở màn hình hẹp, table quan trọng chuyển thành card/list hoặc horizontal scroll có chủ đích.

## 13. Admin test plan

### Unit/component

- Rule condition form validation.
- Localized field behavior.
- Permission-aware navigation.
- Status badge/action availability.

### Integration

- Login/session expiry.
- User filter/pagination.
- Save draft/preview/publish rule.
- Create/publish/archive trip suggestion.
- API error mapping.

### E2E ưu tiên

1. Admin login.
2. Tạo rule draft.
3. Preview.
4. Publish.
5. Mobile generate nhận rule mới.

## 14. Acceptance gate

- USER không mở được admin API dù sửa URL.
- Admin session hết hạn quay về login, không mất draft nếu có thể lưu local tạm an toàn.
- User list pagination/search đúng.
- Suspend/reactivate có audit hoặc ít nhất request log/request ID.
- Rule preview và publish chạy end-to-end.
- Published rule xuất hiện trong mobile generation.
- Trip suggestion preview giống đủ gần mobile card.
- Web không lộ secret/token trong UI/log.
- Keyboard và focus flow dùng được.

## 15. Tài liệu chính thức

- [Vite Getting Started](https://vite.dev/guide/)
- [NestJS OpenAPI](https://docs.nestjs.com/openapi/introduction)
- [OWASP HTML5 Security](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)
