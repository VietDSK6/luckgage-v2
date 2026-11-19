# 13 — Phase 5C: làm lại UI/UX toàn bộ app Expo

**Trạng thái:** đang triển khai. Đã có lượt sửa code toàn app; gate QA trên thiết bị chưa đạt.

**Căn cứ ban đầu:** năm ảnh iOS Simulator do người dùng cung cấp ngày 2026-11-17; code mobile và
`docs/BRAND_SYSTEM.md` hiện tại. Ảnh chỉ cho thấy một phần vấn đề, không giới hạn phạm vi phase
và không phải đặc tả hành vi.

## 1. Vì sao cần phase riêng

Mobile đã có token và component dùng chung nhưng tổng thể vẫn thiếu phân cấp. Nhiều tiêu đề,
button và card cùng đậm, cùng viền, cùng độ nổi; nội dung quan trọng và hành động phụ tranh sự chú
ý. Màu cream/teal phủ diện tích lớn trong khi coral/yellow xuất hiện rời rạc. Những vấn đề này
không giải quyết được bằng một lần đổi mã màu hoặc tăng/giảm border radius.

Code cũng có dấu hiệu lệch khỏi design foundation: `TripsHubScreen.tsx` khai báo riêng nhiều cỡ
chữ/weight bên cạnh token semantic, nên cùng một vai trò text trông khác nhau giữa các màn.

Mục tiêu của 5C là làm lại **toàn bộ UI/UX của app Expo**: mọi route, màn, component, overlay và
trạng thái, kể cả phần không xuất hiện trong năm ảnh. Giao diện phải rõ ràng, dễ đọc và có cảm giác
được thiết kế có chủ đích. Chỉ chốt palette, type scale và component sau khi thử trên màn hình
thật. `docs/BRAND_SYSTEM.md` và token đang là baseline triển khai, không phải phê duyệt cuối cho
diện mạo release. Giữ nhận diện Luki và các product invariants trong spec.

**Admin web để sau:** đợt làm lại giao diện web là một hạng mục riêng, không thuộc scope hoặc gate
5C. Các kiểm tra chức năng/admin đã có trong Phase 4 và 5A vẫn theo kế hoạch hiện tại.

Phase này nằm sau công việc local 5A–5B và trước gate build/staging/rehearsal. Các việc CI/staging
đã làm trước đây vẫn có giá trị; cần build lại sau khi 5C hoàn tất.

### Hướng thị giác đang áp dụng (2026-11-17)

Từ năm ảnh baseline và audit source, chọn hướng **travel utility bình tĩnh**: nền sáng gần trung
tính, surface trắng, teal đậm dành cho CTA/tiến độ quan trọng, coral và vàng chỉ ở điểm nhận diện
hoặc trạng thái. Giữ Luki ở welcome/empty state. Bỏ phần lớn viền card, giảm title weight, rút
header/chip và dùng list row cho thao tác lặp lại. Phương án cũ với nền cream phủ toàn màn, teal
đậm trên nhiều card và viền ở mọi control tạo quá nhiều điểm nhấn ngang nhau trong ảnh baseline.
Đây là quyết định triển khai code, chưa phải phê duyệt release sau so sánh visual trên thiết bị.

Đã cập nhật token light/dark, button, icon button, segmented control, page header, bottom nav,
dialog, action sheet, toast và bottom sheet. Các lượt sửa feature bao phủ auth; Trips Hub, form,
detail; join/QR/members; checklist/import; Smart List; suggestions/guides; Settings; weather.
Tên địa điểm chỉ rút gọn ở header khi tên chuyến trùng nguyên địa chỉ; dữ liệu gốc không đổi.
`checklistReuseShort` chỉ rút nút thao tác, màn import vẫn giữ tiêu đề đầy đủ.

| Nhóm route | Audit source | Đã sửa code | QA trên thiết bị |
|---|---|---|---|
| Welcome, sign in, sign up, recovery | Có | Có, gồm auth frame/field states | Chờ |
| Trips Hub, new/edit, detail | Có | Có | Chờ |
| Join, Members, QR | Có | Có | Chờ |
| Checklist, editor, category sheet, import | Có | Có | Chờ |
| Smart List preview/edit/confirm | Có | Có | Chờ |
| Suggestions list/detail, Guides list/detail, weather | Có | Có; guide detail đi theo token/component mới | Chờ |
| Settings, shared navigation/feedback | Có | Có | Chờ |

Ảnh sau sửa, so sánh 320/375/430 dp, font lớn, VI/EN, light/dark và smoke thao tác thật vẫn cần
thu trên Simulator/thiết bị trước khi đánh dấu xong. Nút bánh răng xanh trong ảnh baseline vẫn cần
được loại khỏi ảnh QA: accessibility tree của Device Hub nhận diện nó là `gearshape.fill`, không
phải thành phần trong source app.

**QA bổ sung 2026-11-17:** ảnh người dùng chỉ ra khu vực “Cùng chuẩn bị” còn rời khỏi nhóm action
và khoảng cách với thời tiết chưa đều. Đã gộp hai action thành một panel có divider, thay avatar
chữ đơn lẻ bằng icon nhóm, giảm khoảng cách trước weather. Bottom sheet trước đó dùng native Modal
`slide`, tạo cảm giác lớp tối xuất hiện rồi sheet kéo lên; đổi sang `fade` cho cả modal và `none`
khi Reduce Motion bật. Đã xem lại Trip Detail và sheet trên iOS Simulator; cần người dùng xác nhận
cảm giác chuyển động trên thiết bị mục tiêu.

## 2. Audit ban đầu từ năm ảnh — ví dụ, không phải giới hạn

Priority: **P0** = che/chặn thao tác; **P1** = làm app thô hoặc khó quét; **P2** = polish.
Số rule tham chiếu `.agents/rules/unslop-design.md`.

| Màn / vị trí | Vấn đề thấy được | Rule | Priority | Hướng sửa cần kiểm chứng |
|---|---|---:|---|---|
| Trips Hub: hero và trip row | Tên địa điểm dài lặp với dòng phụ; hero cao và đặc màu, đẩy danh sách xuống; gần như mọi text đều đậm. | 2, 5, 15, 16 | P1 | Dùng tên hiển thị ngắn trong hero, địa chỉ đầy đủ ở detail; rút hero về thông tin quyết định, tạo nhịp giữa title, metadata và tiến độ. Không sửa dữ liệu địa điểm lưu trên server. |
| Trips Hub: hai nút tạo/tham gia | Hai nút ngang có sức nặng tương đương, label dài sát mép ở màn hẹp. | 17, 18 | P1 | Xác định một CTA chính, một action phụ; kiểm tra wrap và vùng chạm ở 320–375 dp. |
| Settings: tiêu đề, profile, lựa chọn | Display title rất lớn; profile, nhóm tùy chọn và ô giới thiệu đều dùng khối nổi; các lựa chọn theme/language/đơn vị tạo nhiều viền ngang nhau. | 9, 15, 16 | P1 | Chuyển về hierarchy của màn thao tác: header gọn, group/list rõ, selected state có tín hiệu khác ngoài màu; mục phiên bản xuống cuối. |
| Trip Detail: header và summary | Tên địa điểm dài xuất hiện cả header lẫn card; card tóm tắt và hai action card tiếp theo gần như cùng kiểu. | 2, 5, 16, 18 | P1 | Header chỉ nêu context cần thiết; một khối readiness/checklist là điểm nhấn, các hành động còn lại là list/action row theo thứ tự ưu tiên. |
| Checklist: action bar và category | “Dùng lại danh sách” xuống hai dòng trong nút cao bằng “Chia sẻ”; progress block và nhiều category card viền tạo cảm giác dày, chậm quét. | 5, 15, 16, 18 | P1 | Tách hành động thường dùng khỏi action phụ; cho checklist item và checkbox chiếm trọng tâm; giảm box lồng box, giữ divider nơi đủ. |
| Bottom sheet category | Bốn nút lớn có viền và độ đậm gần ngang nhau; thao tác xóa thiếu khoảng cách thị giác với chỉnh sửa. | 16, 18 | P1 | Dùng action rows cho thao tác thường, danger tách riêng; đóng bằng affordance rõ, xác nhận xóa khi có item theo invariant hiện có. |
| Nút bánh răng xanh nổi trên các ảnh | Che nội dung và bottom sheet. Chưa tìm thấy màu/icon này trong source mobile; có thể là overlay của Simulator hoặc công cụ QA. | 15, 17 | P0 nếu thuộc app | Xác minh nguồn trên build sạch; nếu thuộc app thì bỏ/đặt lại và kiểm tra vùng chạm, nếu thuộc hệ thống thì chụp QA không có overlay. |

Điểm vào code để xử lý: `apps/mobile/src/features/trips/TripsHubScreen.tsx`,
`TripDetailScreen.tsx`, `apps/mobile/src/features/checklist/ChecklistScreen.tsx`,
`apps/mobile/src/features/foundation/FoundationScreen.tsx` và các primitive trong
`apps/mobile/src/design/components/` (`AppButton`, `AppPageHeader`, `AppBottomSheet`,
`AppSegmentedControl`, `AppBottomNavigation`). Copy ở `apps/mobile/src/i18n/messages.ts`.

Ảnh không đủ để kết luận về animation, screen reader, dark mode hoặc các màn mobile không xuất
hiện. Các phần này vẫn thuộc phase và phải được kiểm tra trên build thật.

## 3. Phạm vi và thứ tự triển khai

### Inventory bắt buộc

| Bề mặt | Tất cả nhóm màn/luồng phải làm | Trạng thái và lớp giao diện phải đi cùng |
|---|---|---|
| Expo mobile — vào app | Welcome, đăng nhập, đăng ký, khôi phục phiên, loading/redirect auth. | Validation, lỗi đăng nhập/phiên, keyboard, safe area, VI/EN, light/dark. |
| Expo mobile — chuyến đi | Trips Hub, tạo, sửa, detail, xóa, danh sách theo thời gian và trạng thái trip. | Trống, đang tải, lỗi, refresh, địa danh dài, trip nhiều/ít dữ liệu. |
| Expo mobile — cùng chuẩn bị | Nhập mã/quét QR, preview và xác nhận join, thành viên, mã mời/QR, phân công đồ. | Mã sai/hết hạn/thu hồi, camera bị từ chối, quyền owner/member, confirm và feedback. |
| Expo mobile — hành lý | Checklist, category/item editor, quick-add, search/filter, bulk action, dùng lại danh sách và chia sẻ. | 0%/100%, nhiều trăm món, không có category, conflict, undo, sheet/dialog/toast. |
| Expo mobile — nội dung và tiện ích | Gợi ý hành lý/Smart List, trip suggestions list/detail, guides list/detail, weather, reminder và Settings. | Preview/edit/confirm/apply failure, ảnh lỗi, bookmark, weather unavailable, lựa chọn theme/language/°C–°F. |
| Expo mobile — hệ dùng chung | Bottom navigation, page header, button, field, segmented control, card/list row, icon, typography, màu, spacing, dialog, bottom sheet, toast. | Pressed/disabled/loading/selected/error/success, font lớn, Reduce Motion, screen reader. |

Inventory này là checklist theo nhóm; lúc bắt đầu 5C phải đối chiếu với route/component thực tế
trong `apps/mobile/app`, `apps/mobile/src/features` và `apps/mobile/src/design`. Route, modal hoặc
state nào có trong code nhưng chưa liệt kê vẫn thuộc phạm vi. Màn thêm mới trong lúc 5C cũng phải
qua cùng gate.

### 5C.1 — Chẩn đoán và chọn hướng

1. Lập danh sách **từng route, màn, overlay và state** của app Expo; đánh dấu đã audit, đã sửa và
   đã QA. Ghi vấn đề theo 20 unslop rules, severity, ảnh trước sửa và source path.
2. Làm grayscale wireframe cho **Trips Hub, Trip Detail, Checklist, Settings và bottom sheet**.
   Chốt thông tin nào là title, metadata, primary action hoặc secondary action; xóa copy lặp trước
   khi trang trí lại. Đây là màn mẫu để chọn hệ thị giác, không phải danh sách màn sẽ sửa.
3. Thử tối thiểu hai visual directions trên cùng **Trips Hub, Checklist và Settings**, trong
   light và dark. So sánh bằng tiêu chí: nhận ra hành động chính, số thông tin đọc được trong một
   viewport, độ thoáng, độ dài tiếng Việt/Anh và khả năng dùng bằng một tay.
4. Chọn một direction; ghi quyết định và ảnh mẫu vào tài liệu này. Không thay token diện rộng
   trước khi ba màn đại diện đủ thuyết phục.

### 5C.2 — Chốt design foundation

- Chỉnh semantic color cho background/surface/ink/primary/accent/state trong cả light/dark; kiểm
  tra contrast trước khi chốt. Dùng màu để dẫn mắt và báo trạng thái, không dùng chỉ để tô mọi card.
- Chỉnh type scale, weight, line-height, chữ số tabular, quy tắc xuống dòng cho địa danh dài và
  font scaling. Một màn có một tiêu đề chính; body/metadata không cùng weight với heading.
- Chốt spacing/radius/elevation và quy tắc card vs list row. Viền chỉ dùng khi cần nhận diện
  control hoặc nhóm, không vẽ quanh mọi nội dung.
- Chuẩn hóa button, segmented control, header, trip row, checklist row, bottom nav, bottom sheet,
  dialog, toast và empty/loading/error state. Giữ icon cùng họ, đúng optical size và hit target.
- Rà copy VI/EN theo màn: CTA dùng động từ ngắn, không nhắc lại địa danh/trạng thái, không có
  thuật ngữ kỹ thuật; hai ngôn ngữ cùng ý và không vỡ layout.
- Cập nhật `docs/BRAND_SYSTEM.md`, `03_MOBILE_EXPO_AND_UI_UX.md` và token khi direction đã chọn.

### 5C.3 — Áp dụng cho toàn bộ inventory

1. Trips Hub → Trip Detail → Checklist và category/item actions.
2. Create/edit/join, QR preview, Members và gợi ý hành lý preview/edit/confirm.
3. Auth/onboarding, Settings, Trip Suggestions và Guides.
4. Rà lại toàn bộ shared UI và màn phát sinh; sửa mọi điểm còn lệch với direction đã chốt.

Mỗi slice gồm layout, copy, light/dark, state và kiểm tra tương tác. Không đổi API, dữ liệu, quyền
hoặc scope feature chỉ để phục vụ style. Checklist vẫn là nguồn sự thật; Smart List vẫn preview,
cho sửa, yêu cầu confirm và append; weather failure vẫn không chặn trip/checklist.

## 4. Gate 5C — bằng chứng hoàn thành

- Có inventory đối chiếu route/source; **100% màn, overlay và state của app Expo được đánh dấu đã
  audit, đã sửa hoặc ghi rõ không cần sửa, và đã QA**. Có ảnh trước/sau cho từng route chính và
  ảnh sau sửa cho mọi route còn lại cùng trạng thái đại diện; visual direction và token/component
  rules được cập nhật. Không còn P0/P1 trên bất kỳ màn nào.
- Từ Trips Hub, người thử tìm được chuyến cần chuẩn bị và mở checklist; từ Trip Detail biết ngay
  còn thiếu bao nhiêu; trong checklist tick, thêm vật dụng và mở action category không cần dò UI.
- Tại width 320, 375 và 430 dp, text VI/EN không bị cắt/đè; CTA quan trọng không tràn hoặc wrap
  khó đọc. Kiểm tra cả font scale lớn, keyboard, safe area và bottom sheet.
- Light/dark đều có tương phản WCAG AA cho chữ thường 4.5:1, chữ lớn 3:1; icon-only có label,
  touch target tối thiểu 48 dp, trạng thái không chỉ truyền bằng màu, Reduce Motion được tôn trọng.
- Ghi ảnh/clip và kết quả thao tác cho trạng thái loading, empty, error/retry, offline, weather
  unavailable, checklist 0%/100%, Smart List preview/apply failure và join code không hợp lệ.
- QA end-to-end lại mọi luồng mobile trong inventory, gồm create/join, checklist, Smart List và
  guide → suggestion → draft trip để đảm bảo đổi UI không làm mất hành vi. Chạy checks nhỏ nhất
  liên quan, `git diff --check` và kiểm tra `git status` trước khi chốt.

**Gate release:** 5D build/staging phải dùng UI sau 5C; 5E rehearsal chỉ bắt đầu khi gate 5C
đạt. Build/ảnh cũ không được dùng làm bằng chứng cho giao diện mới.
