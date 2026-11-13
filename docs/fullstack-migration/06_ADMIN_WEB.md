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
/guides
/guides/new
/guides/:guideId
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

Trạng thái Phase 4B: đã nối endpoint aggregate thật cho toàn bộ chỉ số bên dưới. UI dùng manifest
theo nhóm tài khoản/chuyến đi/nội dung, có loading, retry, freshness timestamp và không dựng chart
hoặc recent activity giả khi chưa có audit event bền vững.

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

Trạng thái Phase 4B: list/search/filter role-status/sort và pagination đều chạy server-side; filter
được phản ánh trên URL. Detail chỉ hiển thị profile, trip/membership aggregate và session metadata
tối thiểu. Suspend/reactivate dùng dialog có focus trap, bắt buộc CSRF, invalidate cache liên quan và
giữ nguyên dữ liệu. Request log/request ID là dấu vết tối thiểu; audit timeline bền vững chưa được
giả lập bằng `updatedAt`.

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

Trạng thái Phase 4C: đã triển khai revision ledger có search/status filter trên URL và workbench
responsive cho create/edit/preview/publish/archive. Form dùng field có cấu trúc thay vì JSON, kiểm
tra range/key/localization/item trùng ở client rồi vẫn giữ validation phía API. Preview luôn chạy
trên revision đã lưu; khi form dirty phải save trước. Published revision được giải thích rõ là đang
chạy trên mobile và thao tác save tạo DRAFT version mới. Publish/archive/rời form dirty dùng dialog
riêng, không gọi native `alert`/`confirm`.

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

Trạng thái Phase 4D: đã thay placeholder bằng editorial desk responsive. List có search/status trên
URL và card ảnh; workbench có field song ngữ có cấu trúc, destination lookup, validation client +
server, dirty-form guard, preview card mobile VI/EN và dialog riêng cho publish/archive. Published
content lưu mới sẽ thay đổi trực tiếp dữ liệu mobile nên UI hiển thị cảnh báo; archived content là
read-only.

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

Trạng thái Phase 4D: đã nối list thật có search/status/pagination server-side và layout table/card
theo viewport. Privacy seal phản ánh contract: admin chỉ thấy owner display name, member count và
checklist progress aggregate; ghi chú, category và item không được gửi xuống client.

MVP chỉ cần:

- Trip ID/name/destination/date.
- Owner display name.
- Member count.
- Checklist progress aggregate.
- Created/updated time.

Không mở checklist item detail mặc định. Mục đích là chứng minh quản lý/quan sát hệ thống, không
biến admin thành công cụ đọc dữ liệu riêng tư.

## 10. Cẩm nang từ Luki

Phase 4E thêm “Cẩm nang từ Luki” trong sidebar. Danh sách lọc trạng thái, editor nhập title,
summary, cover + alt, tags và section VI/EN theo loại hữu hạn; có preview hai ngôn ngữ và xác
nhận publish/archive và xóa vĩnh viễn draft/archived. Lưu bài published cập nhật nội dung mobile
ngay, vì vậy editor cảnh báo rõ. Bài archived chỉ đọc.

## 11. Frontend architecture

Foundation được dựng tại `apps/admin` bằng Vite, React và TypeScript strict.
Admin auth dùng HttpOnly cookie của API; endpoint restore session trả user cùng CSRF token và client
chỉ giữ token đó trong memory. Router bảo vệ toàn bộ shell, API client chuẩn hóa Problem Details,
field errors và request ID. Dashboard/users/packing rules/trip suggestions/trips support đều dùng
API thật; server state được cache và invalidation bằng TanStack Query.

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

## 12. Form behavior

- Dirty form cảnh báo khi rời trang.
- Save draft và publish là hai hành động khác.
- Mutation loading chỉ disable phần liên quan.
- Field error hiển thị gần field.
- Server conflict giữ lại input và cho reload/compare.
- Destructive/archive có confirm.
- Không confirm cho save draft thông thường.

## 13. Accessibility và responsive

- Keyboard navigation đầy đủ.
- Focus visible.
- Label thật cho form, không chỉ placeholder.
- Dialog trap focus và trả focus đúng.
- Table có caption/header semantics.
- Status có text + icon, không chỉ màu.
- Contrast phù hợp.
- Ở màn hình hẹp, table quan trọng chuyển thành card/list hoặc horizontal scroll có chủ đích.

## 14. Admin test plan

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

## 15. Acceptance gate

- USER không mở được admin API dù sửa URL.
- Admin session hết hạn quay về login, không mất draft nếu có thể lưu local tạm an toàn.
- User list pagination/search đúng.
- Suspend/reactivate có audit hoặc ít nhất request log/request ID.
- Rule preview và publish chạy end-to-end.
- Published rule xuất hiện trong mobile generation.
- Trip suggestion preview giống đủ gần mobile card.
- Web không lộ secret/token trong UI/log.
- Keyboard và focus flow dùng được.

## 16. Tài liệu chính thức

- [Vite Getting Started](https://vite.dev/guide/)
- [NestJS OpenAPI](https://docs.nestjs.com/openapi/introduction)
- [OWASP HTML5 Security](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)
