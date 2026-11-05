# Audit tham chiếu `slink-app-base`

Audit này ghi lại những pattern có thể tham khảo từ repository read-only
`/Users/macbook/Documents/Projects/Apps/slink-app-base`. Đây không phải nguồn sự thật sản phẩm
luckgage và không phải template để sao chép nguyên trạng.

## Phạm vi và snapshot

- Snapshot đã đọc: commit `4181042dcd20e683a7e1aad348f2b8f668e45d88`, ngày 2026-11-04.
- Slink là ứng dụng bare React Native, không phải Expo app và không dùng Expo Router.
- Stack chính: React Native `^0.79.2`, React `19.0.0`, TypeScript `5.0.4`, React Navigation 7,
  Unistyles 2, AsyncStorage, apisauce và Jest 29.
- Package manager được khai báo là Yarn `4.3.1` với `nodeLinker: node-modules`; `.node-version`
  là `22.21.1`. Repository không có workspace config và `yarn.lock` đang bị ignore.
- App có native `android/` và `ios/`; `app.json` chỉ chứa identity của bare React Native. Không
  có `eas.json`, `app.config.*`, Expo config hoặc CI workflow được tìm thấy.

Đối với luckgage v2, phiên bản được xác nhận từ tài liệu Expo chính thức tại thời điểm bootstrap:
Expo SDK 58 stable, React Native 0.88, React 19.3 và Node tối thiểu 22.13.x. Command bootstrap
chính thức là `npx create-expo-app@latest --template default@sdk-58`. Tài liệu:
[create-expo-app](https://docs.expo.dev/more/create-expo/),
[SDK reference](https://docs.expo.dev/versions/latest/) và
[SDK 58 release](https://expo.dev/changelog/sdk-58).

## Source và ownership

Slink chia source theo clean architecture quy mô lớn:

```text
src/
├── presentation/   # component, container, context và hook UI
├── domain/         # entity, repository interface, service và use case
├── data/           # data source, DTO/model, mapper và repository implementation
├── api/            # API client và refresh coordination
├── di/             # singleton DI container
├── navigation/     # React Navigation stack/tab và route types
├── theme/          # primitive/semantic color, size, font và Unistyles
├── locales/        # vi/en
├── core/           # result/error primitives
└── utils/
```

Số lượng file quan sát được cho thấy quy mô khác hẳn foundation luckgage: khoảng 1.102 file ở
`presentation`, 761 ở `data` và 519 ở `domain`. Boundary screen/state/data là ý tưởng hữu ích,
nhưng số lớp và singleton DI không phù hợp Phase 1A.

## Inventory AGENTS và skills

- `AGENTS.md`: có guideline về thay đổi tối thiểu, verification theo mục tiêu, lệnh Yarn, clean
  architecture, alias, Unistyles và i18n. luckgage chỉ ADAPT các rule bền vững về scope nhỏ và
  verification; không copy app-specific command hay architecture.
- Không có `AGENTS.override.md` và không có `.codex/skills`.
- `.agents/skills/react-native-best-practices/SKILL.md`: cổng vào các hướng dẫn React Native New
  Architecture; các sub-skill animation, gesture, SVG, audio, JSI, AI và multithreading không liên
  quan bootstrap tĩnh hiện tại.
- `.agents/skills/vercel-react-native-skills/SKILL.md`: inventory guideline về rendering, safe
  area, navigation, state, list performance và monorepo. Chỉ các nguyên tắc rendering cơ bản,
  safe area và giữ native dependency trong app là liên quan hiện tại.
- `.agents/skills/review-report/SKILL.md`: không liên quan Expo bootstrap nên không dùng.

## Audit pattern

| Pattern | Source path trong slink | Quyết định | Lý do | Cách áp dụng cho luckgage |
|---|---|---|---|---|
| Thay đổi tối thiểu, verification theo mục tiêu | `AGENTS.md` | ADOPT | Phù hợp scope theo phase và giảm code suy đoán | Ghi rule ngắn trong `AGENTS.md`; mọi phase có focused checks và `git diff --check` |
| Yarn 4 + `node-modules` | `package.json`, `.yarnrc.yml` | REJECT | Một app mới không cần Corepack/Yarn config; lockfile slink còn bị ignore | Dùng npm workspaces và commit `package-lock.json` |
| Root workspace sẵn cho nhiều app/package | Không có trong slink | ADAPT | Target architecture cần monorepo nhưng hiện chỉ được tạo mobile | Khai báo `workspaces` cho `apps/*`, `packages/*`; không tạo placeholder |
| Bare React Native native folders | `android/`, `ios/`, `app.json` | REJECT | Trái quyết định Expo/CNG và tăng maintenance ở foundation | Dùng managed Expo; chưa prebuild `android/` hoặc `ios/` |
| React Navigation stack/tab khai báo tập trung | `src/navigation/MainStack.tsx`, `MainTabBar.tsx` | REJECT | Product yêu cầu Expo Router; stack slink quá lớn | Dùng Expo Router file-based routes |
| Route type rõ ràng | `src/navigation/types.ts` | ADAPT | Type safety tốt, nhưng slink truyền object/callback lớn qua route | Bật typed routes; chỉ truyền ID hoặc mode ngắn |
| Safe-area provider và inset | `src/navigation/MainStack.tsx`, `src/presentation/components/page/AISPage.tsx` | ADAPT | Cần safe area nhưng không cần page abstraction sớm | Root layout dùng Router; screen shell dùng `SafeAreaView` từ safe-area-context |
| Tách route khỏi screen | `src/navigation/`, `src/presentation/containers/` | ADAPT | Phù hợp tài liệu mobile luckgage nhưng route slink vẫn import screen trực tiếp khối lớn | Route file mỏng trong `app/`, nội dung màn hình ở `src/` |
| Semantic theme light/dark | `src/theme/unistyles/themes.ts`, `unistyles.ts` | ADAPT | Ý tưởng semantic token tốt; Unistyles không cần cho foundation | Phase 1A dùng token/context nhỏ, hỗ trợ system/light/dark và lưu preference |
| i18n vi/en với key typed | `src/locales/index.ts`, `vi.json`, `en.json` | ADAPT | Đúng target nhưng catalog slink lệch rất lớn giữa vi/en và mang business copy riêng | Phase 1A dùng message map typed, cân bằng vi/en cho copy đang có |
| Accessibility role/label ở component tương tác | `src/presentation/containers/lms/lesson/index.tsx` | ADOPT | Khớp product invariant về label và status không chỉ bằng màu | Màn hình foundation có heading semantics; action tương lai phải có label và target 48 dp |
| Domain/data/presentation boundaries | `src/domain/`, `src/data/`, `src/presentation/` | ADAPT | Boundary hữu ích, nhưng hàng nghìn file và use case cho CRUD là quá mức | Phase 1B đặt Trip domain trong feature và tạo đúng một repository seam SQLite phục vụ chuyển sang REST |
| Singleton DI container và generator boilerplate | `src/di/DIContainer.ts`, `scripts/ais-template.mjs` | REJECT | Quá phức tạp cho Phase 1A và trái explicit composition trong architecture doc | Dùng import/composition trực tiếp; không thêm container hoặc codegen |
| Result union ở data boundary | `src/core/ResultState.ts` | ADAPT | Typed error hữu ích nhưng generic result wrapper chưa cần | Trip repository map lỗi thành mã `VALIDATION` / `NOT_FOUND` / `STORAGE`; UI không parse SQLite error |
| API client tập trung và một refresh coordinator | `src/api/api-service.ts`, `__tests__/api-service.refresh-token.test.ts` | ADAPT | Coordination là pattern đúng cho Phase 3, nhưng client hiện gắn navigation/storage và log response | Phase 3 tạo client theo API contract, không gọi navigation/toast và không log token/payload |
| API endpoint qua environment config | `src/api/api-service.ts`, `.env*` | ADAPT | Base URL tập trung là đúng, nhưng không được copy endpoint hay credential | Chỉ tạo `EXPO_PUBLIC_API_BASE_URL` giả; mọi mobile env đều được coi là public |
| Lưu token bằng AsyncStorage | `src/domain/services/StorageManager.ts` | REJECT | Không đáp ứng security requirement cho credential nhạy cảm | Phase 3 dùng Expo SecureStore cho refresh credential |
| Repository/service/use-case cho mọi domain | `src/data/repositories/`, `src/domain/use-cases/` | REJECT | Boilerplate lớn hơn nhu cầu và có duplicate naming `use-cases`/`usecases` | Chỉ thêm lớp khi có reuse hoặc migration seam thật |
| Focused Jest test cho mapper, cache và refresh | `__tests__/api-service.refresh-token.test.ts`, `lms-course-merge.test.ts` | ADOPT | Test theo invariant/failure path, không theo số lượng | Khi có behavior, thêm unit/component test nhỏ tương ứng |
| App render smoke test | `__tests__/App.test.tsx` | ADAPT | Có giá trị khi test setup tồn tại, nhưng không dùng snapshot lớn | Router test chạy Trips Hub, settings, validation/review và create-to-detail trên route thật |
| Jest preset, ESLint, Prettier, typecheck scripts | `jest.config.js`, `.eslintrc.js`, `.prettierrc.js`, `package.json` | ADAPT | Tooling hợp lý nhưng version/config gắn bare RN và có cấu hình trùng | Dùng tooling do Expo SDK 58 scaffold cung cấp; giữ strict `tsc --noEmit` |
| Alias `@/*` | `tsconfig.json`, `babel.config.js` | ADAPT | Alias hữu ích nhưng danh sách alias slink quá nhiều và phải đồng bộ hai nơi | Dùng tối đa `@/* -> src/*` khi cần; bootstrap có thể dùng relative import đơn giản |
| Babel/Metro tùy biến | `babel.config.js`, `metro.config.js` | REJECT | Slink có config package lệch RN 0.78/0.79 và plugin Reanimated không ở vị trí như chính AGENTS yêu cầu | Dùng default Expo config; chỉ thêm custom config khi có nhu cầu chứng minh được |
| Native dependency đặt trong app package | `.agents/skills/vercel-react-native-skills/SKILL.md` | ADOPT | Tránh hoisting/config plugin mơ hồ trong monorepo | Expo/native dependency thuộc `apps/mobile/package.json` |
| App identity, endpoint, assets, domain copy | `app.json`, `.env*`, `src/assets/`, `src/locales/` | REJECT | Bị cấm và không thuộc domain luckgage | Tạo identity/copy trung tính của luckgage; không sao chép tài nguyên |
| CI/build automation | Không có `.github/workflows` hoặc `eas.json` | REJECT | Không có pattern để kế thừa và ngoài bootstrap tối thiểu | Chưa tạo CI/EAS; chỉ tài liệu hóa lệnh local |

## Rủi ro và phần lỗi thời

- Slink khai báo React Native `^0.79.2` nhưng nhiều package tooling ở `0.78.3`; không thể dùng
  version của slink để chọn stack mới.
- `babel.config.js` đặt plugin Reanimated trước `module-resolver`, xung đột với chính guideline
  “plugin phải cuối”; không sao chép config này.
- `yarn.lock` bị ignore và không được Git track, làm install khó tái lập.
- `.env`, `.env.dev`, `.env.prod`, Firebase config và keystore đang được Git track. Audit không đọc
  giá trị secret; luckgage phải ignore env thật/credential và chỉ commit `.env.example` giả.
- Token truy cập/refresh của slink được lưu qua AsyncStorage; pattern này bị loại cho auth v2.
- API layer đang log toàn bộ response và gọi navigation trực tiếp; có nguy cơ lộ dữ liệu và ghép
  chặt transport với UI.
- Navigation type có nhiều `any`, callback và object domain lớn; luckgage chỉ truyền ID/mode.
- I18n catalog vi/en có độ phủ lệch lớn (1.029 dòng so với 152 dòng), nên không xem đây là mẫu
  hoàn thiện về localization.
- Không tìm thấy CI workflow, EAS config hoặc Expo config; không có evidence để ADOPT build/deploy
  pattern từ slink.

## Quyết định áp dụng vào Expo local

Foundation dùng npm workspaces, Expo SDK 58 managed project, Expo Router, strict TypeScript,
route mỏng, source screen trong `src` và safe area. Phase 1A bổ sung semantic light/dark tokens,
vi/en typed messages, SQLite-backed preferences, SQLite provider, error boundary/dev logging và
Jest 30 theo hướng dẫn Expo. Phase 1B chỉ thêm repository seam cần cho việc chuyển ownership từ
SQLite sang REST, giữ form state tại screen và không thêm DI/global state library. API, auth và
generic use-case layer vẫn được hoãn đến phase cần chúng.
