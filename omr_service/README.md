# OMR FastAPI service

Service này xử lý phiếu trả lời trắc nghiệm 40 câu bằng OpenCV/Python.

## Chạy local

```bash
cd omr_service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## API chính

- `POST /answer-keys`: lưu đáp án chuẩn theo `subject` và `exam_code`.
- `POST /scan`: nhận ảnh phiếu, kiểm tra chất lượng, kéo thẳng/căn chỉnh, nhận diện 160 vòng tròn và chấm điểm.
- `GET /results/export`: xuất toàn bộ kết quả ra Excel.

OCR chữ viết tay hiện được để ở `app/ocr.py` dạng điểm nối tích hợp. Khi có Google Cloud Vision hoặc Azure AI Vision Read, chỉ cần thay phần `recognize_fields_stub` bằng adapter thật, không phải sửa OMR.

Tọa độ vùng thông tin, bốn bảng đáp án, bán kính vòng tròn, ngưỡng chất lượng ảnh và trọng số fill score nằm trong `config/answer_sheet_40.json`.
