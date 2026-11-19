# Luckgage demo trên VPS dùng chung

Triển khai API, admin và PostgreSQL trong Compose project `luckgage-demo`, riêng với Mini PaaS. Chỉ cổng `127.0.0.1:8091` (API) và `127.0.0.1:8092` (admin) được publish trên host. PostgreSQL không publish cổng. Mobile là binary Expo riêng; build mobile phải dùng `EXPO_PUBLIC_API_BASE_URL=https://luckgage-api.ai2p.id.vn/api/v1`.

Theo hướng dẫn VPS dùng chung, đây là cấu hình **demo ít lưu lượng**. Ba container thường trực được giới hạn tổng cộng 960 MiB RAM và 1,30 vCPU; migration chạy một lần trước API. Cần đo lại tài nguyên sau khi chạy và dừng mở rộng nếu RAM khả dụng dưới 1 GiB, swap tăng hoặc load 5 phút vượt 2,0 kéo dài. Không build image cùng lúc với tác vụ nặng của Mini PaaS.

## 1. Chuẩn bị nguồn và secret

Trên VPS, dùng thư mục `/home/user/services/luckgage`:

```bash
mkdir -p /home/user/services/luckgage/{source,backups,secrets}
cd /home/user/services/luckgage
```

Chuyển các file nguồn đã kiểm tra vào `source/`, và chép `source/deploy/vps/compose.yaml` thành `./compose.yaml`. Compose build context là `./source`. Không chép `.git`, `node_modules`, file `.env` local hoặc dữ liệu người dùng vào VPS.

Tạo `.env` và `app.env` từ các file `.example`. Giữ quyền `0600`; không in secret ra terminal/log, không commit. `DB_PASSWORD` nên là 32 byte hex để dùng được trong `DATABASE_URL`. `JWT_ACCESS_SECRET` là chuỗi ngẫu nhiên khác, ít nhất 32 ký tự.

```bash
chmod 600 .env app.env
docker compose config --quiet
```

`API_ORIGIN` là hostname HTTPS của API. `ALLOWED_ORIGINS` trong `app.env` phải là hostname HTTPS của admin. Hai hostname phải cùng site `ai2p.id.vn` để cookie admin `SameSite=Strict` hoạt động. Đổi `API_ORIGIN` cần build lại admin vì Vite nhúng URL khi build.

## 2. Build và chạy

`RELEASE_TAG` phải đổi cho từng bản nguồn. Build **lần lượt**:

```bash
cd /home/user/services/luckgage
docker compose build api
docker compose build admin
docker compose up -d --wait
docker compose ps
curl -fsS http://127.0.0.1:8091/api/v1/health/ready
curl -fsS http://127.0.0.1:8092/health
```

`migrate` tự chạy `prisma migrate deploy` sau khi PostgreSQL healthy và trước khi API khởi động. Không dùng `prisma migrate dev` trên VPS. Cổng 8091/8092 phải còn trống trước lần triển khai đầu. Kiểm tra `docker compose logs --tail=100` nếu `--wait` thất bại.

Để có tài khoản admin ban đầu mà không tạo tài khoản demo với mật khẩu đã biết, tạo file `secrets/admin-password` chứa mật khẩu ngẫu nhiên (0600), rồi chạy một lần:

```bash
docker compose run --rm --no-deps \
  -v /home/user/services/luckgage/secrets/admin-password:/run/secrets/admin-password:ro \
  -e ADMIN_BOOTSTRAP_EMAIL=<email-cua-ban> \
  -e ADMIN_BOOTSTRAP_PASSWORD_FILE=/run/secrets/admin-password \
  api node apps/api/dist/ops/bootstrap-admin.js
```

Script chỉ tạo admin nếu email chưa tồn tại; không đổi mật khẩu của admin hiện có. Không đưa mật khẩu vào tham số lệnh. Sau khi dùng, giữ file secret ngoài Git để bàn giao an toàn hoặc xóa nó bằng quy trình quản lý secret của bạn.

### Nạp nội dung demo (gợi ý chuyến đi và cẩm nang)

`apps/api/src/ops/seed-demo-content.ts` upsert 9 gợi ý chuyến đi và 9 bài cẩm nang theo slug, ảnh từ `images.unsplash.com` (tải được trên cả iOS và Android). Script không tạo user, trip hay checklist; chạy lại sẽ ghi đè nội dung của đúng các slug đó. Nếu image đang chạy chưa có script, build `npm run api:build` ở máy local, chép `apps/api/dist/ops/demo-content.js` và `seed-demo-content.js` vào `ops-tmp/` trên VPS rồi mount vào container:

```bash
cd /home/user/services/luckgage
docker compose run --rm --no-deps \
  -v "$PWD/ops-tmp/demo-content.js:/app/apps/api/dist/ops/demo-content.js:ro" \
  -v "$PWD/ops-tmp/seed-demo-content.js:/app/apps/api/dist/ops/seed-demo-content.js:ro" \
  api node apps/api/dist/ops/seed-demo-content.js
```

Local: `npm run db:seed:content --workspace @luckgage/api`.

## 3. HTTPS qua Cloudflare Tunnel

Trong Cloudflare Zero Trust, thêm **hai Published application routes cụ thể** cho tunnel `mini-paas-vps`, đặt trước wildcard `*.ai2p.id.vn`:

| Hostname | Origin |
|---|---|
| `luckgage-api.ai2p.id.vn` | `http://127.0.0.1:8091` |
| `luckgage-admin.ai2p.id.vn` | `http://127.0.0.1:8092` |

Không mở UFW hoặc cổng Docker ra internet. Nếu quản trị là nội bộ, bảo vệ hostname admin bằng Cloudflare Access. Sau khi route hoạt động, kiểm tra từ máy ngoài VPS:

```bash
curl -fsS https://luckgage-api.ai2p.id.vn/api/v1/health/ready
curl -fsS https://luckgage-admin.ai2p.id.vn/health
curl -fsSI https://luckgage-admin.ai2p.id.vn/login
```

Thử đăng nhập admin trên origin thật để kiểm tra CORS, cookie Secure/SameSite và CSRF. Kiểm tra tải lại một URL sâu của admin để xác nhận SPA fallback. `health/ready` chỉ chứng minh API kết nối database và migration, không thay thế QA giao diện/mobile.

## 4. Backup, cập nhật và rollback

Trước mỗi thay đổi schema hoặc release, tạo SQL dump trong thư mục `backups/` (0600), ghi checksum, rồi chép ít nhất một bản ngoài VPS nếu dữ liệu cần giữ:

```bash
cd /home/user/services/luckgage
mkdir -p backups/$(date -u +%Y%m%d-%H%M%S)
docker compose exec -T postgres pg_dump -U luckgage -d luckgage -Fc > backups/<thu-muc>/luckgage.dump
chmod 600 backups/<thu-muc>/luckgage.dump
sha256sum backups/<thu-muc>/luckgage.dump > backups/<thu-muc>/luckgage.dump.sha256
```

Thay `<thu-muc>` bằng tên thư mục vừa tạo. Kiểm tra restore vào database **riêng** trước khi coi backup là dùng được. Không chạy `docker compose down -v` vì sẽ xóa volume PostgreSQL.

Để cập nhật, chép snapshot nguồn mới vào `source/`, đặt `RELEASE_TAG` mới, chạy `docker compose config --quiet`, build lần lượt API/admin rồi `docker compose up -d --wait`. Ghi tag cũ và giữ image cũ để rollback bằng cách đổi tag trong `.env` rồi `docker compose up -d --wait --no-build`. Nếu migration không tương thích ngược, rollback image còn cần khôi phục database từ backup phù hợp.

Sau deploy, kiểm tra `free -h`, `/sbin/swapon --show`, `df -hT /`, `uptime`, `docker stats --no-stream`, `docker compose ps` và tình trạng Mini PaaS. Dừng hoặc hạ tải nếu vượt ngân sách trong tài liệu VPS dùng chung.
