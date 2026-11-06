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

Không sửa trực tiếp PNG bằng công cụ nén mất dữ liệu. Nếu cần biến thể, tạo file mới trong cùng
folder, ghi rõ use case và cập nhật bảng trên. Không dùng app icon như hero phóng lớn và không dùng
mascot toàn thân ở kích thước icon.

## 4. Màu nhận diện

Token production nằm tại `apps/mobile/src/design/tokens/index.ts`; không hard-code màu brand trong
screen mới.

| Vai trò | Light | Ý nghĩa |
|---|---:|---|
| Background | `#FFF7E8` | Giấy travel journal ấm |
| Surface | `#FFFFFF` | Vùng nhập liệu/card cần rõ |
| Ink | `#12312F` | Text chính và nét minh hoạ |
| Primary | `#0F766E` | Hành động chính, độ tin cậy |
| Primary soft | `#DDF4EF` | Nền nhấn nhẹ |
| Accent | `#FF665C` | Peak moment và điểm hành trình |
| Sun | `#F6C84C` | Lỗ thẻ, optimistic moment |

Tỷ lệ gợi ý: background/surface chiếm phần lớn, teal cho cấu trúc và CTA, coral/yellow chỉ làm điểm
nhấn. Dark mode dùng semantic token hiện có, không đảo màu PNG hoặc tự tạo filter.

## 5. Hệ icon

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

## 6. Motif giao diện

- **Luggage tag:** hero/card có một lỗ thẻ hoặc crop rõ ràng, không thêm notch giả vào mọi card.
- **Route line:** đường mảnh nối các bước hoặc mốc, luôn đi cùng label/icon.
- **Travel sticker:** coral/yellow là accent nhỏ, có thể xoay 2–4 độ; không xoay text dài.
- **Editorial hierarchy:** một display title, body dễ đọc, eyebrow uppercase ngắn.
- **Screen-print texture:** chỉ có trong minh hoạ Luki; component UI vẫn phẳng và sắc nét.

## 7. Giọng điệu

Copy ngắn, cụ thể, đồng hành và không đổ lỗi. Ưu tiên nói điều người dùng có thể làm tiếp theo.

| Tránh | Dùng |
|---|---|
| “Có lỗi xảy ra” | “Chưa tải được chuyến đi. Thử lại nhé.” |
| “Generate bằng AI” | “Tạo gợi ý theo quy tắc chuyến đi” |
| “Bạn chưa nhập đủ dữ liệu” | “Thêm ngày về để tiếp tục” |
| “Success!” | “Đã thêm 6 món vào checklist” |

## 8. Checklist khi mở rộng

1. Dùng semantic token và `AppIcon` hiện có trước khi thêm giá trị mới.
2. Chọn đúng vai trò: Luki cho cảm xúc, Lucide cho thao tác, `BrandMark` cho nhận diện nhỏ.
3. Kiểm tra light/dark, tiếng Việt/Anh, font scaling và width 375.
4. Đảm bảo icon-only control có label và vùng chạm 48 dp.
5. Thêm asset vào inventory, nêu nền/kích thước/use case.
6. Chạy mobile typecheck, lint, tests, `git diff --check` và bundle smoke test.

Backlog có chủ đích, chưa được coi là asset production: Luki celebration, Luki weather, Luki error,
notification icon đơn sắc và adaptive Android icon foreground/background.

## 9. Prompt tái tạo asset

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

## 10. QA acceptance

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

## 11. Tài liệu dependency

- [Lucide packages và React Native package](https://lucide.dev/packages)
- [Lucide React Native guide](https://lucide.dev/guide/packages/lucide-react-native)
- [Expo `react-native-svg`](https://docs.expo.dev/versions/latest/sdk/svg/)
