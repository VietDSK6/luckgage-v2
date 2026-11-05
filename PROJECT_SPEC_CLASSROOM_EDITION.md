# Đặc tả luckgage — Classroom Edition

## 1. Mục tiêu

luckgage hỗ trợ người dùng lập kế hoạch chuyến đi và chuẩn bị hành lý. Đồ án tập trung vào những kiến thức có thể giải thích trực tiếp: giao diện Android, điều hướng, quản lý state, CRUD với Room, gọi REST API và kiểm thử logic.

## 2. Phạm vi chức năng

### Chuyến đi

- Hiển thị chuyến đi sắp tới, đang diễn ra và đã qua.
- Tạo chuyến đi với điểm đến, ngày bắt đầu/kết thúc, loại chuyến đi và ghi chú.
- Sửa hoặc xóa chuyến đi.
- Chọn kết quả địa điểm để lưu tọa độ phục vụ dự báo thời tiết.

### Checklist

- Mỗi chuyến đi có nhiều danh mục; mỗi danh mục có nhiều vật dụng.
- Thêm, sửa, xóa danh mục và vật dụng.
- Cập nhật số lượng, ghi chú và trạng thái đã chuẩn bị.
- Tìm vật dụng và lọc theo tất cả/chưa xếp/đã xếp.
- Hiển thị đếm ngược, mức sẵn sàng và tiến độ tổng/từng danh mục.
- Chia sẻ bản văn bản của checklist qua Android Sharesheet.
- Đánh dấu hoặc bỏ đánh dấu toàn bộ vật dụng trong một danh mục.
- Hiển thị QR của checklist và nhập QR thành một chuyến đi cục bộ mới sau bước xem trước. Dữ liệu nhập không tạo phòng, không đồng bộ và đặt mọi vật dụng về trạng thái chưa xếp.
- Xóa chuyến đi sẽ xóa checklist liên quan bằng khóa ngoại Room.

### Gợi ý hành lý

- Bộ luật cục bộ tạo gợi ý từ loại chuyến đi, thời lượng, hoạt động, ghi chú và dự báo thời tiết khi có.
- Ví dụ: chuyến đi biển thêm đồ bơi; hiking/camping thêm áo khoác chống nước; chuyến quốc tế thêm hộ chiếu.
- Kết quả chỉ là gợi ý. Người dùng phải xem trước, chọn/chỉnh sửa và xác nhận trước khi lưu.
- Khi lưu, vật dụng được nối thêm vào checklist hiện tại; dữ liệu cũ không bị ghi đè.

### Thời tiết

- Open-Meteo Geocoding tìm địa điểm và Open-Meteo Forecast cung cấp dự báo.
- Dự báo được cache cục bộ.
- Không cần API key hoặc secret trong repository.
- Mất mạng hoặc không có dự báo không được làm hỏng luồng tạo/sửa chuyến đi và checklist.

### Nhắc chuẩn bị

- Người dùng có thể bật thông báo cục bộ trước ngày đi 1 hoặc 3 ngày.
- Lựa chọn được lưu cùng chuyến đi trong Room và lịch được đặt bằng WorkManager.
- Android 13 trở lên chỉ bật nhắc lịch sau khi người dùng cấp quyền thông báo.

### Cài đặt

- Giao diện sáng, tối hoặc theo hệ thống.
- Tiếng Việt hoặc tiếng Anh.
- Độ C hoặc độ F.
- Xóa toàn bộ dữ liệu cục bộ sau khi xác nhận.

## 3. Ngoài phạm vi

- Đăng nhập, tài khoản và phân quyền.
- Backend riêng, Docker hoặc cơ sở dữ liệu máy chủ.
- Mã mời, tham gia chuyến đi, đồng bộ và cộng tác thời gian thực.
- Xuất file checklist; ứng dụng chỉ chia sẻ văn bản qua Sharesheet hoặc bản sao cục bộ bằng QR.
- AI/LLM và các bí mật API.
- Template danh sách hành lý.
- Nhiều Gradle module hoặc domain/use-case layer riêng.

## 4. Kiến trúc

```text
Compose Screen
    -> ViewModel (UiState bằng StateFlow)
        -> Repository (ranh giới lỗi)
            -> Room / DataStore / Open-Meteo
```

- Composable chỉ hiển thị state và gửi sự kiện.
- ViewModel giữ state màn hình và điều phối nghiệp vụ.
- Repository chuyển lỗi kỹ thuật thành lỗi mà UI hiểu được.
- Room là nguồn dữ liệu chuẩn cho Trip (gồm lựa chọn nhắc lịch), ChecklistCategory, ChecklistItem và WeatherCache.
- DataStore chỉ lưu cài đặt và cờ onboarding.
- WorkManager chạy thông báo nhắc lịch cục bộ đã được người dùng bật.
- Hilt tạo và cung cấp các dependency.

## 5. Điều hướng chính

```text
Onboarding -> Trips -> Create/Edit Trip -> Trip Detail
                                      |-> Checklist
                                      |-> Rule-based Suggestions

Bottom navigation: Trips | Settings
```

## 6. Tiêu chí hoàn thành

- Luồng tạo, sửa, xóa chuyến đi hoạt động và tồn tại sau khi mở lại app.
- Checklist CRUD, đánh dấu hoàn thành và tiến độ hoạt động đúng.
- Tìm/lọc checklist, thao tác cả danh mục, chia sẻ văn bản/QR và nhắc lịch 1/3 ngày hoạt động đúng.
- Gợi ý theo luật luôn có bước preview/xác nhận và chỉ append dữ liệu.
- Có thể tìm địa điểm/xem thời tiết; lỗi mạng không chặn chức năng cục bộ.
- Unit test bao phủ logic quan trọng của ViewModel/repository.
- `testDebugUnitTest`, `assembleDebug` và `lintDebug` chạy thành công.
