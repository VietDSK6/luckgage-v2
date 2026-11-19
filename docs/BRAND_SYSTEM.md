# Brand system — luckgage và Luki

Tài liệu này là nguồn sự thật cho nhận diện trong app. Khi thêm màn hình hoặc asset mới, cập nhật
tài liệu này cùng code để tránh tạo thêm một phong cách song song.

## 1. Ý tưởng cốt lõi

**Travel Tag Spirit** biến chiếc thẻ hành lý thành một người bạn đồng hành. luckgage không hứa làm
chuyến đi hoàn hảo; sản phẩm giúp người dùng bình tĩnh, biết mình còn thiếu gì và chuẩn bị cùng
nhau.

Ba thuộc tính cần giữ ở mọi điểm chạm:

- **Bình tĩnh:** bố cục rõ, nhiều khoảng thở, trạng thái không gây hoảng.
- **Chuẩn bị tốt:** checklist, đường hành trình và dấu xác nhận có ý nghĩa chức năng.
- **Ấm và có cá tính:** cream, coral, sun yellow và minh hoạ thủ công có kiểm soát.

## 2. Linh thú Luki

Luki là linh thú sinh ra từ một luggage tag: thân teal hình thẻ, lỗ xỏ thẻ màu vàng, tai gợi cáo,
khăn coral như một chiếc đuôi và một checklist nhỏ. Tính cách của Luki là lanh lợi, điềm tĩnh,
chuẩn bị kỹ và đồng hành; không phải nhân vật em bé hoặc mascot 3D bóng bẩy.

### Vai trò trong sản phẩm

| Ngữ cảnh | Dùng Luki | Không dùng |
|---|---|---|
| Welcome/onboarding | Hero để giới thiệu tính cách | Lặp ở mọi card |
| Empty state quan trọng | Minh hoạ giúp giải thích bước tiếp theo | Thay thế CTA/copy |
| Loading cấp app | Một lần, nhỏ, cùng progress indicator | Mutation cục bộ |
| Success/celebration | Biến thể riêng trong tương lai | Dùng asset hero rồi xoay/crop tuỳ ý |
| Error | Chỉ dùng khi có biến thể được duyệt | Làm lỗi trông như trò đùa |

Luki hero phải có chiều rộng tối thiểu 96 dp để mặt, lỗ thẻ và checklist còn đọc được. Ở kích thước
nhỏ hơn, dùng `BrandMark` hoặc icon Lucide. Asset mặc định là trang trí và không được focus bởi
screen reader; chỉ thêm accessibility label khi chính hình truyền tải thông tin chưa có trong copy.

## 3. Asset nguồn sự thật

| Asset | Path | Nền | Dùng cho |
|---|---|---|---|
| Luki toàn thân | `apps/mobile/assets/brand/luki-mascot.png` | Transparent RGBA | Welcome, loading, empty state |
| App icon/brand mark | `apps/mobile/assets/brand/app-icon.png` | Opaque teal RGB | Expo app icon, brand mark 40–58 dp |
| Component mascot | `apps/mobile/src/design/components/BrandLuki.tsx` | Theo theme | Kích thước, crop và accessibility thống nhất |
| Bộ tem tỉnh thành | `apps/mobile/src/features/journeys/stamps.ts` | Manifest TypeScript | 34 ảnh, tên, chú thích, vùng và thông tin ven biển |
| Tem Hà Nội | `apps/mobile/assets/stamps/ha-noi.png` | Transparent RGBA, 384 × 512, cắt sát viền tem | Bộ sưu tập hành trình; địa danh Hà Nội |
| Tem Huế | `apps/mobile/assets/stamps/hue.png` | Transparent RGBA, 384 × 512, cắt sát viền tem | Bộ sưu tập hành trình; địa danh Huế |
| Tem Lai Châu | `apps/mobile/assets/stamps/lai-chau.png` | Transparent RGBA, 384 × 512, cắt sát viền tem | Bộ sưu tập hành trình; địa danh Lai Châu |
| Tem Điện Biên | `apps/mobile/assets/stamps/dien-bien.png` | Transparent RGBA, 384 × 512, cắt sát viền tem | Bộ sưu tập hành trình; địa danh Điện Biên |
| Tem Sơn La | `apps/mobile/assets/stamps/son-la.png` | Transparent RGBA, 384 × 512, cắt sát viền tem | Bộ sưu tập hành trình; địa danh Sơn La |
| Tem Lạng Sơn | `apps/mobile/assets/stamps/lang-son.png` | Transparent RGBA, 384 × 512, cắt sát viền tem | Bộ sưu tập hành trình; địa danh Lạng Sơn |
| Tem Quảng Ninh | `apps/mobile/assets/stamps/quang-ninh.png` | Transparent RGBA, 384 × 512, cắt sát viền tem | Bộ sưu tập hành trình; địa danh Quảng Ninh |
| Tem Thanh Hóa | `apps/mobile/assets/stamps/thanh-hoa.png` | Transparent RGBA, 384 × 512, cắt sát viền tem | Bộ sưu tập hành trình; địa danh Thanh Hóa |
| Tem Nghệ An | `apps/mobile/assets/stamps/nghe-an.png` | Transparent RGBA, 384 × 512, cắt sát viền tem | Bộ sưu tập hành trình; địa danh Nghệ An |
| Tem Hà Tĩnh | `apps/mobile/assets/stamps/ha-tinh.png` | Transparent RGBA, 384 × 512, cắt sát viền tem | Bộ sưu tập hành trình; địa danh Hà Tĩnh |
| Tem Cao Bằng | `apps/mobile/assets/stamps/cao-bang.png` | Transparent RGBA, 384 × 512, cắt sát viền tem | Bộ sưu tập hành trình; địa danh Cao Bằng |
| Tem Tuyên Quang | `apps/mobile/assets/stamps/tuyen-quang.png` | Transparent RGBA, 384 × 512, cắt sát viền tem | Bộ sưu tập hành trình; địa danh Tuyên Quang |
| Tem Lào Cai | `apps/mobile/assets/stamps/lao-cai.png` | Transparent RGBA, 384 × 512, cắt sát viền tem | Bộ sưu tập hành trình; địa danh Lào Cai |
| Tem Thái Nguyên | `apps/mobile/assets/stamps/thai-nguyen.png` | Transparent RGBA, 384 × 512, cắt sát viền tem | Bộ sưu tập hành trình; địa danh Thái Nguyên |
| Tem Phú Thọ | `apps/mobile/assets/stamps/phu-tho.png` | Transparent RGBA, 384 × 512, cắt sát viền tem | Bộ sưu tập hành trình; địa danh Phú Thọ |
| Tem Bắc Ninh | `apps/mobile/assets/stamps/bac-ninh.png` | Transparent RGBA, 384 × 512, cắt sát viền tem | Bộ sưu tập hành trình; địa danh Bắc Ninh |
| Tem Hưng Yên | `apps/mobile/assets/stamps/hung-yen.png` | Transparent RGBA, 384 × 512, cắt sát viền tem | Bộ sưu tập hành trình; địa danh Hưng Yên |
| Tem Hải Phòng | `apps/mobile/assets/stamps/hai-phong.png` | Transparent RGBA, 384 × 512, cắt sát viền tem | Bộ sưu tập hành trình; địa danh Hải Phòng |
| Tem Ninh Bình | `apps/mobile/assets/stamps/ninh-binh.png` | Transparent RGBA, 384 × 512, cắt sát viền tem | Bộ sưu tập hành trình; địa danh Ninh Bình |
| Tem Quảng Trị | `apps/mobile/assets/stamps/quang-tri.png` | Transparent RGBA, 384 × 512, cắt sát viền tem | Bộ sưu tập hành trình; địa danh Quảng Trị |
| Tem Đà Nẵng | `apps/mobile/assets/stamps/da-nang.png` | Transparent RGBA, 384 × 512, cắt sát viền tem | Bộ sưu tập hành trình; địa danh Đà Nẵng |
| Tem Quảng Ngãi | `apps/mobile/assets/stamps/quang-ngai.png` | Transparent RGBA, 384 × 512, cắt sát viền tem | Bộ sưu tập hành trình; địa danh Quảng Ngãi |
| Tem Gia Lai | `apps/mobile/assets/stamps/gia-lai.png` | Transparent RGBA, 384 × 512, cắt sát viền tem | Bộ sưu tập hành trình; địa danh Gia Lai |
| Tem Khánh Hòa | `apps/mobile/assets/stamps/khanh-hoa.png` | Transparent RGBA, 384 × 512, cắt sát viền tem | Bộ sưu tập hành trình; địa danh Khánh Hòa |
| Tem Lâm Đồng | `apps/mobile/assets/stamps/lam-dong.png` | Transparent RGBA, 384 × 512, cắt sát viền tem | Bộ sưu tập hành trình; địa danh Lâm Đồng |
| Tem Đắk Lắk | `apps/mobile/assets/stamps/dak-lak.png` | Transparent RGBA, 384 × 512, cắt sát viền tem | Bộ sưu tập hành trình; địa danh Đắk Lắk |
| Tem TP. Hồ Chí Minh | `apps/mobile/assets/stamps/ho-chi-minh.png` | Transparent RGBA, 384 × 512, cắt sát viền tem | Bộ sưu tập hành trình; địa danh TP. Hồ Chí Minh |
| Tem Đồng Nai | `apps/mobile/assets/stamps/dong-nai.png` | Transparent RGBA, 384 × 512, cắt sát viền tem | Bộ sưu tập hành trình; địa danh Đồng Nai |
| Tem Tây Ninh | `apps/mobile/assets/stamps/tay-ninh.png` | Transparent RGBA, 384 × 512, cắt sát viền tem | Bộ sưu tập hành trình; địa danh Tây Ninh |
| Tem Cần Thơ | `apps/mobile/assets/stamps/can-tho.png` | Transparent RGBA, 384 × 512, cắt sát viền tem | Bộ sưu tập hành trình; địa danh Cần Thơ |
| Tem Vĩnh Long | `apps/mobile/assets/stamps/vinh-long.png` | Transparent RGBA, 384 × 512, cắt sát viền tem | Bộ sưu tập hành trình; địa danh Vĩnh Long |
| Tem Đồng Tháp | `apps/mobile/assets/stamps/dong-thap.png` | Transparent RGBA, 384 × 512, cắt sát viền tem | Bộ sưu tập hành trình; địa danh Đồng Tháp |
| Tem Cà Mau | `apps/mobile/assets/stamps/ca-mau.png` | Transparent RGBA, 384 × 512, cắt sát viền tem | Bộ sưu tập hành trình; địa danh Cà Mau |
| Tem An Giang | `apps/mobile/assets/stamps/an-giang.png` | Transparent RGBA, 384 × 512, cắt sát viền tem | Bộ sưu tập hành trình; địa danh An Giang |

Bản xem nhanh 34 tem nằm tại `docs/gamification/stamps-contact-sheet.png`. Chủ thể, màu nhấn,
chú thích và quy tắc tạo ảnh nằm trong `docs/gamification/province-stamps.json`; trạng thái tem
chưa mở khóa được render từ cùng PNG theo đặc tả, không có bộ ảnh riêng.

Không sửa trực tiếp PNG bằng công cụ nén mất dữ liệu. Nếu cần biến thể, tạo file mới trong cùng
folder, ghi rõ use case và cập nhật bảng trên. Không dùng app icon như hero phóng lớn và không dùng
mascot toàn thân ở kích thước icon.

## 4. Màu nhận diện

Token production nằm tại `apps/mobile/src/design/tokens/index.ts`; không hard-code màu brand trong
screen mới.

| Vai trò | Light | Ý nghĩa |
|---|---:|---|
| Background | `#F7F7F2` | Nền sáng trung tính, dịu mắt khi đọc danh sách dài |
| Surface | `#FFFFFF` | Vùng nhập liệu/card cần rõ |
| Ink | `#193331` | Text chính và nét minh hoạ |
| Primary | `#006F65` | Hành động chính, độ tin cậy |
| Primary soft | `#E6F3F0` | Nền chọn/nhấn nhẹ |
| Accent | `#E46F5E` | Peak moment và điểm hành trình |
| Sun | `#F5C75E` | Lỗ thẻ, optimistic moment |

Tỷ lệ gợi ý: background/surface chiếm phần lớn, teal dành cho CTA và một điểm nội dung chính trên
màn, coral/yellow là điểm nhấn nhỏ. Dark mode dùng nền `#101C1B`, surface `#1A2A29`, primary
`#87D7C8` và semantic token tương ứng; không đảo màu PNG hoặc tự tạo filter.

### Semantic contrast

- `accent` là màu trang trí cho sticker, route dot và peak moment; không dùng cho text/icon chức năng
  trên nền sáng.
- `accentStrong` là coral có contrast đủ cho trạng thái chức năng như active icon.
- `outline` chỉ dùng cho divider và biên surface cần thiết để phân nhóm.
- `outlineStrong` dùng cho input, segmented option, checkbox và control chưa selected.
- Test contrast nằm tại `apps/mobile/src/design/tokens/index.test.ts`; đổi token phải cập nhật và chạy
  test này.

## 5. Design foundation

Nguồn sự thật là `apps/mobile/src/design/tokens/index.ts`. Feature mới không tự tạo scale song song.

### Typography

| Token | Vai trò |
|---|---|
| `display` | Một tiêu đề thương hiệu chính trên màn hub/welcome/settings |
| `screenTitle` | Tiêu đề nội dung cấp màn |
| `sectionTitle` | Tên section chính |
| `cardTitle` | Tên card/category |
| `body`, `bodyStrong` | Nội dung và nội dung nhấn |
| `bodySmall`, `label`, `caption` | Metadata, control label và trợ giúp |
| `eyebrow` | Nhãn editorial ngắn, uppercase |
| `nav` | Bottom navigation |

Scale 5C: display 30/36, screen title 25/31, section title 20/27, card title 17/23, body 16/24.
Heading chủ yếu dùng weight 700; display 800; metadata 400–500. Không tạo font size mới chỉ để sửa
một màn. Một màn chỉ có tối đa một `display`; checklist ưu tiên `screenTitle`/`sectionTitle` để giữ
mật độ thao tác.

### Spacing và radius

- Spacing dùng scale `x1`–`x16`: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.
- Page padding mặc định là `x5` (20), section gap thường là `x6` (24), gap control thường là `x2`
  hoặc `x3`.
- `small` cho chi tiết nhỏ, `control` cho input/button, `panel` cho group, `card` cho card nội dung,
  `hero` chỉ dành cho hero thật sự và `pill` cho chip tròn.
- Radius 5C là 6/10/14/18/22 dp cho small/control/panel/card/hero. Không dùng card bo tròn quanh
  mọi section. Ưu tiên divider/list row ở màn thao tác thường xuyên; viền dành cho field, checkbox
  và control cần nhận diện, không vẽ quanh mọi card.

### Control và motion

- `control.minTouchTarget` là 48 dp; `fieldHeight` là 52 dp; page max width là 640 dp.
- Motion dùng `fast`, `normal`, `slow`; component phải đọc Reduce Motion và đưa duration về 0 khi
  user yêu cầu.
- Stack route thể hiện depth; đổi bottom tab chỉ crossfade, không slide ngang.

## 6. Hệ icon

App dùng **Lucide React Native** qua `AppIcon`, cùng `react-native-svg` tương thích Expo SDK. Mọi
screen import `AppIcon`; không import icon library trực tiếp. Cách này giữ một vocabulary semantic,
độ dày nét và accessibility nhất quán.

Quy tắc:

- Nét mặc định `2.2`, đầu nét bo tròn; kích thước phổ biến 19–22 dp.
- Icon hỗ trợ nhãn, không thay nhãn ở hành động quan trọng.
- Icon-only control phải có touch target tối thiểu 48 × 48 dp và `accessibilityLabel` trên control.
- Icon trang trí bị ẩn khỏi accessibility tree; screen reader đọc label của nút/tab.
- Không dùng emoji, Unicode arrow hoặc trộn icon filled/outlined trong UI.
- Không dùng sparkle để ngụ ý AI. Packing suggestions luôn được gọi rõ là rule-based.
- Chỉ thêm semantic name vào `AppIcon` khi có use case thật.

| Semantic name | Lucide icon | Dùng cho |
|---|---|---|
| `luggage` | Luggage | Trips/home, bắt đầu hành trình |
| `settings` | Settings2 | Settings tab |
| `arrowLeft` / `arrowRight` | ArrowLeft / ArrowRight | Back và tiến tới |
| `create` | Plus | Tạo trip/item |
| `join` | TicketCheck | Tham gia bằng invite |
| `calendar` | CalendarDays | Ngày đi |
| `checklist` | ListChecks | Checklist/benefit |
| `group` | UsersRound | Thành viên/cộng tác |
| `login` / `signUp` | LogIn / UserPlus | Auth |
| `retry` | RotateCcw | Thử lại |

Lucide React Native được phát hành dưới giấy phép ISC. Khi nâng version, chạy typecheck, Jest và
bundle smoke test vì tên export có thể thay đổi.

## 7. Motif giao diện

- **Luggage tag:** motif sống trong Luki và minh hoạ brand; card/form UI không vẽ thêm lỗ thẻ giả.
- **Route line:** đường mảnh nối các bước hoặc mốc, luôn đi cùng label/icon; không dùng làm trang trí.
- **Travel sticker:** coral/yellow là accent nhỏ, có thể xoay 2–4 độ; không xoay text dài.
- **Editorial hierarchy:** một display title, body dễ đọc. Eyebrow chỉ dùng khi mang thông tin
  (vd. tên section phía trên tên chuyến đi, trạng thái); không dùng eyebrow trang trí.
- **Screen-print texture:** chỉ có trong minh hoạ Luki; component UI vẫn phẳng và sắc nét.

Mọi thay đổi UI phải qua checklist "unslop" trong `.agents/rules/unslop-design.md`.

## 8. Giọng điệu

Copy ngắn, cụ thể, đồng hành và không đổ lỗi. Ưu tiên nói điều người dùng có thể làm tiếp theo.
Tiêu đề nói thẳng màn hình làm gì (≤ 8 từ), không dùng câu hỏi bay bổng. Bỏ câu mô tả nếu bỏ đi
mà người dùng vẫn hiểu. Không đưa chi tiết kỹ thuật (định dạng ngày, nguồn dữ liệu) vào copy.

| Tránh | Dùng |
|---|---|
| “Có lỗi xảy ra” | “Chưa tải được chuyến đi. Thử lại nhé.” |
| “Generate bằng AI” | “Tạo gợi ý theo quy tắc chuyến đi” |
| “Bạn chưa nhập đủ dữ liệu” | “Thêm ngày về để tiếp tục” |
| “Success!” | “Đã thêm 6 món vào checklist” |
| “Đi đâu tiếp?” + câu thơ phía dưới | “Chuyến đi của bạn” |

## 9. Component contract

Feature phải dùng primitive trong `src/design/components` trước khi tự dựng lại:

- `AppText`: typography semantic.
- `AppButton`, `AppIconButton`: CTA và icon-only control.
- `AppPageHeader`, `AppSectionHeader`: hierarchy cấp màn/section.
- `AppSegmentedControl`: lựa chọn đơn trong một nhóm nhỏ.
- `AppBottomSheet`: chỉnh sửa phụ mà không làm mất context của list.
- `AppDialog`: xác nhận cần chủ ý, đặc biệt với thao tác phá hủy.
- `AppFeedbackProvider`: API typed `confirm`, `choose`, `showToast` cho feedback dùng chung.
- `AppToast`: phản hồi thụ động, tự đóng; có info/success/warning/danger và live announcement.
- `AppBottomNavigation`: chỉ hai destination MVP.

Product component chỉ extract khi có ít nhất hai use case thật. Checklist item editor dùng bottom sheet;
không bung form nhiều field giữa danh sách. Settings dùng group/list, không hiển thị phase, stack kỹ
thuật hoặc trạng thái implementation cho end user.

### Chọn đúng loại feedback

- Dialog dùng khi cần người dùng xác nhận một hệ quả hoặc thao tác không thể hoàn tác.
- Action sheet dùng để chọn trong nhóm hành động theo context; destructive action luôn đứng sau và
  dùng danger tone.
- Toast dùng cho kết quả thụ động không cần quyết định tiếp theo, ví dụ đã sao chép mã; lỗi chặn flow
  phải có inline error hoặc error state, không chỉ biến mất trong toast.
- Validation thuộc ngay cạnh field. Undo có thể là snackbar/toast có action nếu hành động vẫn phục
  hồi được.
- Feature không gọi `Alert.alert` hoặc action sheet native. React Native `Modal` được phép làm portal
  cho component custom, nhưng visual, copy, theme, focus và action phải thuộc design system.
- Feedback phải dùng message vi/en, safe area, touch target 48 dp và tôn trọng Reduce Motion.

## 10. Checklist khi mở rộng

1. Dùng semantic token và `AppIcon` hiện có trước khi thêm giá trị mới.
2. Chọn đúng vai trò: Luki cho cảm xúc, Lucide cho thao tác, `BrandMark` cho nhận diện nhỏ.
3. Kiểm tra light/dark, tiếng Việt/Anh, font scaling và width 375.
4. Đảm bảo icon-only control có label và vùng chạm 48 dp.
5. Thêm asset vào inventory, nêu nền/kích thước/use case.
6. Chạy mobile typecheck, lint, tests, `git diff --check` và bundle smoke test.

Backlog có chủ đích, chưa được coi là asset production: Luki celebration, Luki weather, Luki error,
notification icon đơn sắc và adaptive Android icon foreground/background.

## 11. Prompt tái tạo asset

Prompt gốc được lưu để có thể tạo biến thể nhất quán. Không coi lần generate mới là thay thế tự
động; phải review silhouette, palette, transparency và khả năng đọc ở kích thước mục tiêu.

### Luki toàn thân

```text
Use case: logo-brand
Asset type: primary mobile-app mascot illustration and brand character cutout
Primary request: Create an original mythical travel guardian named Luki, a small friendly spirit born from a luggage tag. Luki has a compact rounded luggage-tag-shaped teal body with one small circular tag hole integrated near the upper corner, two subtle fox-like ears, tiny sturdy legs, and a warm coral scarf that flows like a tail. Luki holds a small cream packing checklist with three simple check marks. The character should feel clever, calm, prepared, and companionable rather than babyish.
Scene/backdrop: no scene; genuinely transparent background
Style/medium: premium flat editorial sticker illustration with a subtle screen-print grain, strong clean silhouette, slightly imperfect hand-drawn geometry, limited flat colors, polished mobile product branding
Composition/framing: single full-body character, three-quarter pose, centered, generous transparent padding, readable at both 48px and 240px
Color palette: deep travel teal #0F766E, warm cream #FFF7E8, coral #FF665C, sun yellow #F6C84C, dark blue-green ink #12312F
Materials/textures: very subtle paper/screen-print texture only; crisp outer edges
Constraints: original character; no text; no letters; no wordmark; no scenery; no extra character; no shadows outside the silhouette; no gradient; no mockup; no watermark; preserve actual transparency
Avoid: generic kawaii blob, corporate 3D mascot, photorealism, glossy plastic, huge anime eyes, childish proportions, overly detailed clothing
```

### App icon

```text
Use case: identity-preserve
Asset type: production mobile app icon artwork
Input images: Image 1 is the approved Luki mascot anchor illustration
Primary request: Recompose the same Luki character into a bold square app icon. Show Luki's head and upper torso at a friendly three-quarter angle, keep the luggage-tag hole, fox-like ears, cream face, calm confident expression, and coral scarf. Remove the checklist from this icon composition. Place the character on a warm cream circular field inside a deep travel-teal square background, with a small coral corner accent inspired by a luggage sticker.
Style/medium: same premium flat editorial screen-print style as Image 1; simplified for small-size legibility
Composition/framing: centered close crop, generous safe margin, strong silhouette, balanced at 1024 square
Color palette: preserve deep travel teal #0F766E, warm cream #FFF7E8, coral #FF665C, sun yellow #F6C84C, dark blue-green ink #12312F
Constraints: preserve Luki's identity, face, proportions, tag-hole motif, palette, and line style; opaque full-bleed square background; no text; no letters; no checklist; no mockup; no rounded device mask; no watermark; no gradient
Avoid: redesigning the mascot, glossy 3D, photorealism, extra characters, tiny decorative detail
```

## 12. QA acceptance

### Trong Expo Go

- Welcome hiển thị BrandMark, Luki toàn thân, ba icon benefit và hai CTA có icon; không cắt nội
  dung ở width 375.
- Chuyển VI/EN không làm title, benefit hoặc CTA tràn ngang.
- Sign in/sign up hiển thị BrandMark ở top bar, back icon có vùng chạm 48 dp và button icon thẳng
  hàng với label.
- Sau khi đăng nhập, Trips Hub dùng BrandMark; empty state dùng Luki; create/join và bottom tabs
  dùng cùng nét Lucide.
- Checklist, Packing Studio, trip form/detail và Settings không còn Unicode icon giả; check/search/
  edit/back/disclosure cùng một style.
- Light/dark mode giữ text đọc được; mascot không bị filter hoặc đổi màu sai.
- VoiceOver/TalkBack đọc label của button/tab một lần, không đọc tên từng SVG path hoặc asset trang
  trí.

### Cần development/standalone build

- Icon Luki xuất hiện ở launcher/home screen. Expo Go vẫn hiển thị icon của Expo Go nên không dùng
  nó để kết luận app icon sai.
- Splash Luki xuất hiện trên nền `#FFF7E8` khi cold start app đã cài; hot reload không phải phép thử
  splash hợp lệ.
- Kiểm tra icon ở iOS và Android thật trước release. Adaptive Android foreground/background vẫn là
  backlog và phải được tạo thành asset riêng nếu cần safe zone tốt hơn.

### Regression nhanh

- Tạo tài khoản, đăng nhập và đăng nhập demo vẫn hoạt động.
- Tạo/join trip, mở checklist, toggle packed và mở Settings vẫn điều hướng đúng.
- Không có màn hình nào mất label vì icon được thêm vào button.

## 13. Tài liệu dependency

- [Lucide packages và React Native package](https://lucide.dev/packages)
- [Lucide React Native guide](https://lucide.dev/guide/packages/lucide-react-native)
- [Expo `react-native-svg`](https://docs.expo.dev/versions/latest/sdk/svg/)
