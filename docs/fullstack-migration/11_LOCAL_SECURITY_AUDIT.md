# 11 — Security audit local (Phase 5A)

Ngày 2026-11-13. Phạm vi: source code và API tests trên môi trường local; chưa thay thế kiểm tra
staging HTTPS, cấu hình proxy, device hoặc QA giao diện của người dùng.

| Kiểm soát | Bằng chứng | Trạng thái |
|---|---|---|
| Password và refresh token | Argon2id; integration test kiểm tra refresh rotation, reuse và revoke; DB lưu refresh hash | Qua test |
| Quyền trip | `MembershipsService` kiểm tra active member/owner; integration test kiểm tra member bị gỡ không đọc checklist và owner-only action | Qua test |
| Admin session/CSRF | Cookie HttpOnly + SameSite Strict; mutation thiếu CSRF bị từ chối trong integration test | Qua test local |
| CORS và HTTP headers | API foundation test xác minh origin được cấu hình, origin lạ không nhận CORS allow header, cùng `nosniff` và `X-Frame-Options` | Qua test |
| Nội dung admin | Guide sections có schema hữu hạn, không nhận HTML; bài public chỉ trả published | Qua unit/integration test |
| Secrets trong Git | Không có `.env`/key file được track; tìm private key và token pattern phổ biến không thấy kết quả | Qua kiểm tra cơ bản |
| Demo seed | Remote/production DB yêu cầu `ALLOW_DEMO_SEED=true`; không tự ghi demo data vào production | Qua kiểm tra guard |

Điểm cần xác minh khi có staging: cookie `Secure` qua HTTPS/proxy, CORS của origin thật, CSP của
admin host, quyền truy cập database và nơi lưu secret. Rate limiter auth hiện giữ counter trong
memory một process; phải đổi sang shared store nếu triển khai nhiều API instance. Manual
accessibility và visual QA thuộc người dùng, chưa được ghi là pass.
