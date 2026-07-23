# OMR Auto Grading

Website cham phieu tra loi trac nghiem 40 cau tu camera dien thoai.

## Cau truc

- `frontend`: Next.js app. Mo camera, chup anh, gui dap an chuan len backend, hien thi va sua ket qua, xuat Excel.
- `backend`: FastAPI app. Nhan anh, kiem tra chat luong, phat hien phieu, can chinh phoi canh, nhan dien 40 cau tra loi, cham diem va tao Excel.
- `shared`: API contracts va dinh nghia template OMR.

## Chay local

Backend:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -e .
uvicorn app.main:app --reload --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Mo `http://localhost:3000`.

## API

- `POST /api/v1/grading/scan`
- `POST /api/v1/export/excel`
- `GET /api/v1/templates/omr-40-v1`
- `GET /api/v1/health`
