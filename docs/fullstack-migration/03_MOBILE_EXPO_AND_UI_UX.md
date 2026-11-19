# 03 — Expo mobile và định hướng UI/UX

## 1. Mục tiêu trải nghiệm

Trạng thái ngày 2026-11-17: token và component đã được chỉnh theo hướng 5C trong code; kiểm tra
trên thiết bị và gate release vẫn đang chờ. [Phase 5C — làm lại UI/UX](13_UI_UX_REDESIGN.md)
audit ảnh hiện tại, thử hướng mới trên màn đại diện và cập nhật tài liệu này sau khi chốt. Các
quy tắc nghiệp vụ và accessibility trong đặc tả vẫn áp dụng xuyên suốt.

Người dùng mở luckgage để trả lời nhanh ba câu:

1. Chuyến đi nào cần chuẩn bị?
2. Còn thiếu gì?
3. Ai đang cùng chuẩn bị?

Cảm xúc mục tiêu:

- Bình tĩnh vì không bỏ sót đồ.
- Có động lực vì tiến độ rõ.
- Hào hứng trước chuyến đi.
- Tin tưởng vì suggestion giải thích được và không tự sửa dữ liệu.

UI mới không chạy theo hiệu ứng phô trương. Mỗi hình dạng, màu và chuyển động phải giúp người
dùng nhìn ra trạng thái hoặc hành động quan trọng.

Copy dùng câu tự nhiên, đủ thông tin để người dùng quyết định bước tiếp theo. Giảm phần lặp và
trang trí trước khi rút ngắn câu; không ép mọi hướng dẫn thành nhãn cụt hoặc bỏ mất ngữ cảnh.
Tiếng Việt và tiếng Anh phải giữ cùng ý, với cách diễn đạt thuận tai ở từng ngôn ngữ.

## 2. Hướng thị giác: Travel Tag 2.0

### Tính cách

- Editorial: typography và hierarchy rõ như một travel journal.
- Tactile: card gợi liên tưởng luggage tag, boarding pass và passport stamp.
- Warm: nền sand, accent coral/sun tạo năng lượng.
- Trustworthy: ocean teal và ink navy giữ cảm giác ổn định.
- Playful có kiểm soát: illustration nhỏ, route line và stamp chỉ làm điểm nhấn.

### Không làm

- Không biến mọi section thành cùng một rounded card.
- Không lạm dụng gradient, glassmorphism hoặc blur.
- Không dùng ảnh stock ngẫu nhiên có palette khác nhau.
- Không dùng emoji và icon trộn nhiều phong cách.
- Không để toàn bộ text cùng weight hoặc cùng kích thước.
- Không bê nguyên Material 3 component styling từ Compose.

## 3. Design system production

Nguồn sự thật là `apps/mobile/src/design/tokens/index.ts` và `docs/BRAND_SYSTEM.md`. Không tạo
typography, spacing, radius hoặc màu song song trong feature. Token contrast có Jest regression test.

### Color

| Token | Light 5C | Vai trò |
|---|---:|---|
| color.background | #F7F7F2 | Nền sáng trung tính, khoảng 60% diện tích |
| color.surface | #FFFFFF | Card/input chính |
| color.ink | #193331 | Heading và body chính |
| color.inkMuted | #576D6B | Nội dung phụ |
| color.primary | #006F65 | CTA và trạng thái active |
| color.primarySoft | #E6F3F0 | Chip/selected surface nhẹ |
| color.accent | #E46F5E | Accent trang trí, không dùng cho functional text trên nền sáng |
| color.accentStrong | #AF453A | Functional coral đạt contrast |
| color.sun | #F5C75E | Trip tag và optimistic moment |
| color.success | #237859 | Hoàn tất |
| color.warning | #956611 | Cảnh báo |
| color.danger | #B33A36 | Destructive/error |
| color.outline | #E2E8E4 | Divider và biên nhóm |
| color.outlineStrong | #718480 | Boundary cần thiết để nhận diện control |

Dark mode dùng nền ink sâu, surface nâng nhẹ và giảm độ bão hòa accent. Không đảo màu máy móc.

### Typography

Scale semantic gồm `display`, `screenTitle`, `sectionTitle`, `cardTitle`, `body`, `bodyStrong`,
`bodySmall`, `label`, `caption`, `eyebrow` và `nav`. Chỉ một display title trên mỗi màn; checklist
và list thao tác ưu tiên title nhỏ để tăng mật độ. Số phần trăm/progress dùng tabular numeral.

### Spacing

Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.

- Screen horizontal padding: 20 hoặc 24.
- Khoảng section mặc định: 24; chỉ hero/editorial section mới dùng 32.
- Card padding: 16 hoặc 20; hero thật sự mới dùng 24.
- Khoảng item liên quan: 8 hoặc 12.
- Touch target: tối thiểu 48.

### Shape

- Input/chip nhỏ: radius 12.
- Card thường: radius 20.
- Hero/large sheet: radius 28.
- Luggage tag card được phép có một góc cắt hoặc notch nhỏ, nhưng không hy sinh hit target.

### Elevation

- Ưu tiên border và surface contrast.
- Shadow mềm, tinted theo nền.
- Chỉ hero, floating action hoặc bottom action bar cần elevation rõ.

### Shared primitives

- `AppText`, `AppButton`, `AppIconButton`.
- `AppPageHeader`, `AppSectionHeader`.
- `AppSegmentedControl`, `AppBottomSheet`.
- `AppBottomNavigation` và `AppIcon`.

Input/control dùng `outlineStrong`; `outline` chỉ dùng cho divider/card decoration. Component có
motion phải đọc Reduce Motion. Feature không hiển thị phase, framework, data-source hoặc trạng thái
implementation cho end user.

## 4. Information architecture

Bottom navigation MVP giữ hai destination và một hành động nhanh ở giữa:

- Trips.
- Quét QR: mở camera trong luồng join, không phải tab nội dung.
- Settings.

Nút QR là hành động, không có trạng thái selected như hai tab. Màu và nhãn của QR phải khác
trạng thái tab đang mở.

Auth/onboarding nằm trước app shell. Create/join/detail/checklist/suggestions/members là nested
flow trong Trips.

Trip suggestions được đưa vào:

- Onboarding/empty state.
- Destination step khi tạo trip.
- Section gợi ý trong Trips Hub nếu có nội dung published.

Không thêm tab Discover trước khi có đủ nội dung và yêu cầu rõ. Admin có CRUD không đồng nghĩa
mobile phải có thêm tab.

## 5. Route map

~~~text
(auth)/
  welcome
  sign-in
  sign-up

(app)/
  (tabs)/
    trips (index)
    settings
  trip/new
  trip/join
  trip/[tripId]
  trip/[tripId]/edit
  trip/[tripId]/checklist
  trip/[tripId]/checklist/import
  trip/[tripId]/packing-studio
  trip/[tripId]/members
  trip/suggestions
  trip/suggestions/[slug]
~~~

`Trips` và `Settings` thuộc một Expo Router Tabs navigator để đổi destination không dùng Stack
transition và giữ state của từng tab. Chuyển tab dùng crossfade 160 ms; icon, label và indicator
active chuyển trạng thái trong 180 ms, không slide ngang. Bottom bar custom thuộc tabs layout, bao
gồm cả bottom safe area. Các route `trip/*` vẫn thuộc Stack cha để giữ transition theo chiều sâu.
Nút QR ở giữa bottom bar mở `trip/join?scan=1`; màn hình join khởi động camera và vẫn yêu cầu xem
trước, xác nhận trước khi tạo membership.

Route chỉ nhận ID hoặc mode ngắn. Không truyền full trip/checklist object trong route params.

Trạng thái Phase 4D: Trips Hub có entry “Khám phá gợi ý” nhưng không thêm tab Discover. Danh sách
và detail đọc nội dung localized đã publish từ API. CTA ở detail truyền duy nhất `slug` sang
`trip/new`; form tự tải lại suggestion rồi prefill destination metadata, type và duration vào draft
có thể sửa. Mở suggestion không ghi trip và vẫn cần người dùng review/save rõ ràng.

Phase 4E: thêm entry “Cẩm nang từ Luki” ở Trips Hub và route `trip/guides` cùng
`trip/guides/[slug]`. List/detail đọc bài published; section heading, paragraph, image, bullet list,
callout render bằng React Native. Detail có hành động lưu bài thứ cấp và CTA chính mở suggestion
liên quan hoặc tạo trip. Nếu suggestion đã archive, CTA fallback tạo trip. Không thêm tab Discover
trước khi có khoảng 12–20 bài thực.

## 6. Core flow

### 6.1. Onboarding và auth

Mục tiêu: giúp user hiểu giá trị và tới create/join nhanh.

Nội dung:

- Một illustration luggage tag/route line thống nhất với brand.
- Headline: “Mang đủ. Đi nhẹ đầu.”
- Ba benefit ngắn: trip, checklist, cùng chuẩn bị.
- CTA chính: Bắt đầu.
- Sau auth: hai lựa chọn rõ “Tạo chuyến đi” và “Tham gia bằng mã”.

Không dùng carousel dài. Tối đa hai màn hình trước auth.

Onboarding chỉ hoàn tất sau create hoặc join thành công. Nếu auth xong rồi thoát, lần sau quay lại
bước lựa chọn, không giả rằng setup đã xong.

### 6.2. Trips Hub

Thứ tự nhìn khi đã có chuyến đi:

1. Greeting ngắn và avatar/profile shortcut.
2. Hero trip gần nhất.
3. Hành động tạo hoặc tham gia chuyến đi.
4. Upcoming/active/past groups.
5. Lối vào gợi ý và cẩm nang sau danh sách chuyến đi.

Thẻ trip gần nhất giữ gọn để danh sách còn lại không bị đẩy quá xa. Thẻ gồm:

- Tên chuyến đi, điểm đến, ngày khởi hành và trạng thái thời gian.
- Số món đã chuẩn bị khi checklist có dữ liệu.
- Một hành động mở chuyến đi; CTA checklist nằm ngay đầu Trip Detail.

Empty state không chỉ có icon:

- Illustration tag chưa ghi.
- Copy giải thích.
- CTA tạo trip.
- Secondary CTA join code.
- Lối vào gợi ý và cẩm nang để tìm ý tưởng khi chưa có chuyến đi.

### 6.3. Create trip

Dùng flow ba bước, mỗi bước một mục tiêu:

1. Where & when: destination, start/end date.
2. Trip style: type, activities, optional note.
3. Review: tóm tắt và save.

Nguyên tắc:

- Progress indicator nhỏ, không chiếm nhiều chiều cao.
- Common choices dùng selectable chip thay vì bắt gõ.
- Date invalid được giải thích inline.
- Destination suggestion hiển thị country/admin area để tránh chọn nhầm.
- CTA cố định trong thumb zone.
- Back giữ dữ liệu đã nhập trong session.
- Không xin notification permission trong form trip.

Sửa chuyến đi hiển thị các trường trên một trang với nút “Lưu thay đổi” cố định. Người dùng có thể
đổi một trường mà không phải đi lại ba bước tạo mới.

### 6.4. Join trip

- Có hành động quét QR bằng camera; chỉ xin quyền khi người dùng chọn quét.
- QR chỉ chứa join code, không chứa dữ liệu trip. Quét xong gọi cùng API preview như nhập mã.
- Khi camera bị từ chối hoặc QR không hợp lệ, người dùng có thể nhập mã.
- Input code rõ ràng, hỗ trợ paste.
- Không tự join ngay khi nhập đủ ký tự.
- Sau lookup hiển thị preview: trip, owner, date, destination.
- User bấm xác nhận Join.
- Code invalid/expired/revoked có message riêng.
- Nếu đã là member, điều hướng vào trip và báo nhẹ, không tạo lỗi kỹ thuật.

### 6.5. Trip command center

Đây là màn hình điều phối, không phải trang chứa mọi chi tiết.

Thứ tự:

1. Tóm tắt gọn: destination, date/countdown và loại chuyến đi.
2. Readiness và CTA checklist trong cùng một khối có thể chạm.
3. Packing suggestion và members/invite.
4. Weather strip: success/cached/unavailable.
5. Notes và secondary actions.

Edit/delete nằm trong overflow. Delete cần confirm. Edit là reversible nên không cần confirm.

Weather unavailable chỉ làm weather strip chuyển state; phần còn lại không đổi.

### 6.6. Checklist

Đây là màn hình được dùng nhiều nhất, cần nhanh hơn đẹp.

Layout:

- Sticky compact header: progress + packed/total.
- Search và filter mở theo yêu cầu để checklist ngắn không mất chỗ cho thanh công cụ.
- Category header có count và bulk action.
- Item row có checkbox, name, quantity/note và overflow.
- Inline quick-add ở cuối category.
- Form tạo category chỉ mở khi người dùng chọn thêm; checklist trống có thể mở form ngay.

Behavior:

- Toggle item phản hồi tức thì, rollback nếu API thất bại.
- Add item giữ keyboard và focus hợp lý cho nhập liên tiếp.
- Delete item có undo snackbar; delete category cần confirm nếu chứa item.
- Filter không làm mất context của category.
- Stable key là item ID.
- 100% packed kích hoạt celebration ngắn rồi hiển thị readiness summary.
- Thành viên có thể chọn người chuẩn bị và đánh dấu đồ quan trọng trong trình sửa vật dụng. Bộ lọc
  “Chỉ đồ của tôi” và tiến độ theo người nằm trong checklist, không tạo tab mới.
- “Dùng lại danh sách” mở màn chọn trip nguồn, xem trước từng vật dụng, chỉnh hoặc bỏ chọn rồi xác
  nhận thêm vào trip hiện tại. Các món mới chưa xếp và không thay đổi danh sách cũ.
- “Chia sẻ” gửi bản văn bản qua share sheet của thiết bị. Trip Detail nêu tên các món quan trọng
  chưa xếp và dẫn về checklist.

### 6.7. Packing Studio

Tên trải nghiệm phía UI có thể là “Gợi ý hành lý”; “Packing Studio” chỉ là tên thiết kế nội bộ.

Flow:

1. Dòng ngữ cảnh gọn: điểm đến, thời lượng và thời tiết nếu đã có.
2. Optional activity chips/notes.
3. Generate.
4. Preview thành các dòng vật dụng có tên, số lượng, danh mục và lý do.
5. User chọn/bỏ chọn; chạm một dòng mới mở các trường chỉnh sửa.
6. Sticky CTA “Thêm N món vào checklist”.
7. Success summary và điều hướng về checklist.

Peak moment:

- Lý do gợi ý nằm ngay dưới món tương ứng để người dùng hiểu trước khi chọn.
- Source label nói rõ nguồn gợi ý mà không chiếm một thẻ riêng.
- Không dùng sparkle/AI icon.

Apply failure:

- Giữ nguyên preview.
- Hiển thị retry inline.
- Không generate lại và làm mất chỉnh sửa.

### 6.8. Members và invite

- Hiển thị owner trước, sau đó members.
- Avatar/photo nếu có; fallback initials nhất quán.
- Owner tạo code với expiry preset đơn giản.
- Code có copy/share và revoke.
- Sau khi tạo code, owner thấy QR của chính code đó; revoke phải ẩn cả code lẫn QR.
- Không hiển thị join code cũ sau khi revoke.
- Remove member cần confirm.

### 6.9. Settings

- Profile summary.
- Theme.
- Language.
- Temperature.
- Notification permission/status.
- Sign out.
- About/build information ở cuối.

Không đặt destructive account action gần các setting thường.

## 7. Component inventory

Chỉ extract component sau khi pattern xuất hiện thật ở ít nhất hai vị trí hoặc có giá trị design
system rõ ràng.

### Brand components

- TravelTagCard.
- RouteLine.
- PassportStampBadge.
- DestinationArtwork.

### Product components

- TripHeroCard.
- TripCompactCard.
- ReadinessRing.
- WeatherStrip.
- MemberStack.
- ChecklistCategoryHeader.
- ChecklistItemRow.
- InlineQuickAdd.
- SuggestionReasonBadge.
- JoinCodeCard.
- StickyBottomAction.

### State components

- EmptyJourneyState.
- InlineErrorBanner.
- SkeletonTripCard.
- OfflineNotice.
- RetryCard.
- SuccessSummary.

Không tạo generic Card bao trùm mọi style. Brand card và data row có mục đích khác nhau.

## 8. Motion và feedback

Motion token draft:

- Fast: 120 ms cho press/check.
- Standard: 200 ms cho state transition.
- Emphasis: 320 ms cho hero/celebration.

Quy tắc:

- Checkbox dùng scale/fill nhẹ.
- Progress thay đổi animate nhưng không chậm thao tác.
- Bottom sheet giữ transition platform-consistent.
- Root mount một `AppFeedbackProvider`; feature gọi API typed thay vì dựng feedback ad-hoc.
- Dialog dành cho confirm có hệ quả, action sheet dành cho menu theo context, toast dành cho phản
  hồi thụ động tự đóng và inline state dành cho validation/lỗi cần xử lý.
- Không dùng `Alert.alert` hoặc action sheet native. React Native `Modal` chỉ là portal cho component
  custom có token, i18n, safe area và accessibility của luckgage.
- Haptic chỉ cho apply thành công, join thành công và 100%; không rung mọi tap.
- Reduce motion tắt stagger, confetti và large transforms.

Peak moment 1: Smart List preview được dựng rõ nguyên nhân.

Peak moment 2: Checklist 100% với animation ngắn, copy “Sẵn sàng lên đường”.

End moment: khi rời flow apply, hiển thị summary và next action.

## 9. Trạng thái bắt buộc

Mỗi screen phải có thiết kế cho:

- Initial loading.
- Refreshing.
- Empty.
- Content.
- Inline error.
- Full blocking error chỉ khi không còn nội dung dùng được.
- Offline/cached.
- Permission denied nếu liên quan.
- Success feedback.

Không dùng full-screen spinner cho mutation card-level. Không xóa content cũ khi refresh.

## 10. Accessibility

- Touch target tối thiểu 48 x 48 dp.
- Icon-only button có accessibilityLabel.
- Screen title và section quan trọng có heading semantics.
- Checkbox label đọc được item name, quantity và state.
- Progress có text alternative: “Đã chuẩn bị 7 trên 10 món”.
- Status không truyền bằng màu duy nhất; thêm icon/text.
- Font scaling không làm CTA mất hoặc item name bị cắt vô nghĩa.
- Focus order theo visual order.
- Success/error live announcement không lặp.
- Contrast audit cho light/dark trước release.

## 11. Responsive

Baseline thiết kế ở chiều rộng 375.

- Phone: một cột.
- Large phone/tablet portrait: content max width khoảng 600.
- Tablet landscape: trip detail có thể hai cột; checklist giữ readable column.
- Không stretch text/form tới toàn màn hình lớn.
- Safe area và keyboard inset được xử lý ở shell.

## 12. Expo implementation structure

~~~text
apps/mobile/
├── app/                         # Expo Router routes, mỏng
├── src/
│   ├── features/
│   │   ├── auth/
│   │   ├── trips/
│   │   ├── checklist/
│   │   ├── packing-suggestions/
│   │   ├── members/
│   │   └── settings/
│   ├── design/
│   │   ├── tokens/
│   │   ├── components/
│   │   └── icons/
│   ├── data/
│   │   ├── local/
│   │   ├── remote/
│   │   └── repositories/
│   ├── i18n/
│   └── platform/
└── assets/
~~~

Route file:

- Đọc route param.
- Gọi screen component.
- Xử lý navigation boundary.

Feature screen:

- Render state.
- Gửi action.
- Không gọi SQLite/fetch trực tiếp.

Repository:

- Mapping storage/API error sang domain error.
- Không gọi toast/navigation.

## 13. Expo capability mapping

| Capability | Hướng dùng |
|---|---|
| Routing/deep link | Expo Router |
| Local relational data Phase 1 | Expo SQLite |
| Token | Expo SecureStore |
| Preferences | Async key-value storage, không mã hóa nếu không nhạy cảm |
| Local reminder | Expo Notifications |
| QR scan nếu còn scope | Expo Camera |
| Build chia sẻ nhóm | Expo development build/internal distribution |

Remote notification trên Android không nên được kiểm thử chỉ bằng Expo Go; kế hoạch build phải có
development build khi feature này được đưa vào.

## 14. UI acceptance criteria

- Người dùng mới nhìn thấy create/join trong tối đa hai màn hình sau auth.
- User có thể thêm nhanh ba item liên tiếp mà không mở ba dialog.
- Từ Trip Detail tới Checklist tối đa một tap.
- Từ Trip Detail tới Smart List tối đa một tap.
- Suggestion preview luôn nói rõ nguồn rule-based.
- Apply button luôn cho biết số item được thêm.
- Weather error không thay Trip Detail thành full-screen error.
- Empty state có CTA rõ.
- Dark mode và tiếng Việt không gây overflow nghiêm trọng.
- Checklist 100% có closure rõ nhưng celebration không cản thao tác.

## 15. Quy trình thiết kế trước code

1. Chốt moodboard Travel Tag 2.0.
2. Vẽ grayscale wireframe cho 8 flow chính.
3. Chọn một visual direction qua ba màn hình: Trips Hub, Checklist, Packing Studio.
4. Chốt token.
5. Tạo clickable prototype cho create/join/checklist/apply.
6. Review accessibility và text overflow.
7. Sau đó mới xây component.

Không code toàn bộ design system trước khi ba màn hình đại diện được duyệt.

## 16. Tài liệu Expo chính thức

- [Expo Router](https://docs.expo.dev/router/introduction/)
- [Expo storage overview](https://docs.expo.dev/develop/user-interface/store-data/)
- [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Expo Camera](https://docs.expo.dev/versions/latest/sdk/camera/)
- [Expo Build](https://docs.expo.dev/build/)
