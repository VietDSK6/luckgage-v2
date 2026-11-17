# Bộ gợi ý hành lý

Catalog hiện có 19 rule published, gồm 1 bộ đồ cơ bản (12 món), 8 bộ theo loại chuyến đi,
6 bộ theo hoạt động, 1 bộ cho chuyến từ 5 ngày và 3 bộ theo dự báo thời tiết. Mỗi preview chỉ lấy
các bộ khớp chuyến đi, nên người dùng không phải duyệt toàn bộ catalog. Bản VI/EN có cùng ý nghĩa;
lý do hiển thị cho từng món được giữ ngắn. Người dùng vẫn xem, sửa và chọn món trước khi thêm vào
checklist.

| Nhóm | Điều kiện | Số món bổ sung |
|---|---|---:|
| Cơ bản | Mọi chuyến | 12 |
| Loại chuyến | Nghỉ ngơi, công tác, cắm trại, biển, trekking, thành phố, đường bộ, nước ngoài | 3–7 mỗi loại |
| Hoạt động | Bơi, đi bộ dài, cắm trại, chụp ảnh, tập luyện, sự kiện trang trọng | 3 mỗi hoạt động |
| Chuyến dài | Từ 5 ngày | 2 |
| Thời tiết | Khả năng mưa ≥60%, nhiệt độ thấp nhất ≤15°C, cao nhất ≥32°C | 3 mỗi điều kiện |

Các gợi ý thời tiết chỉ xuất hiện khi có dự báo. Không có dự báo thì các bộ cơ bản, loại chuyến,
hoạt động và số ngày vẫn hoạt động. Ghi chú chuyến đi hiện chưa được engine dùng để match rule;
không tạo rule phụ thuộc nội dung ghi chú khi khả năng này chưa được triển khai.

## Cập nhật dữ liệu

Từ `apps/api`, chạy `npm run db:seed:packing` với `DATABASE_URL` đã cấu hình. Với database remote
hoặc `NODE_ENV=production`, cần thêm `ALLOW_PACKING_RULE_SEED=true`. Lệnh này chỉ sửa catalog
packing, không tạo lại user/demo/trip và không xóa checklist. Chạy lại sẽ bỏ qua revision đã có,
giữ nguyên các chỉnh sửa của admin. `baseline-essentials` v1 được archive và v2 được publish để
tránh hiện trùng các món cũ. Seed toàn bộ (`db:seed`) cũng gọi cùng catalog này.

Khi cần sửa nội dung đã xuất bản, tạo revision mới trong admin thay vì sửa revision published.
Catalog code nằm ở `apps/api/src/packing-suggestions/packing-rule-catalog.ts`.
