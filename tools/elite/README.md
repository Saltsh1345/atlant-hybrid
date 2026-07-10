# Elite / YOLO tools

## Быстрый путь (без Roboflow)

1. **Сейчас в приложении** уже работает Olympic Track через MediaPipe + эталоны в `src/lib/elite/references.ts`.

2. **Для YOLO на видеоклипах** — self-hosted inference:

### Colab train (boxing, 9 классов ATLANT)

Классы: `jab, cross, hook, forehand, backhand, serve, squat, bench, lunge`

```python
# В Google Colab
!pip install ultralytics datasets huggingface_hub

from huggingface_hub import snapshot_download
# Или используйте Roboflow Universe boxpunch-detector (347 img, CC BY 4.0)
# для быстрого POC только boxing

from ultralytics import YOLO
model = YOLO("yolov8n.pt")
model.train(data="path/to/data.yaml", epochs=50, imgsz=640)
model.export(format="onnx")  # optional
```

### FastAPI server (fork Yolo-App pattern)

```python
# server.py
from fastapi import FastAPI, UploadFile
from ultralytics import YOLO

app = FastAPI()
model = YOLO("best.pt")

@app.post("/predict")
async def predict(file: UploadFile):
    import tempfile, os
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as f:
        f.write(await file.read())
        path = f.name
    r = model(path, conf=0.4)[0]
    os.unlink(path)
    preds = [{"class": model.names[int(b.cls)], "confidence": float(b.conf)} for b in r.boxes]
    return {"predictions": preds}
```

```bash
pip install fastapi uvicorn ultralytics python-multipart
uvicorn server:app --host 0.0.0.0 --port 8000
```

### .env.local

```env
YOLO_PROVIDER=custom
YOLO_API_URL=http://127.0.0.1:8000/predict
```

## Pro dataset links

См. `PRO_DATASET_CATALOG` в `src/lib/elite/references.ts`.

### NealBeans BoxingDataset

- https://huggingface.co/datasets/NealBeans/BoxingDataset
- 2278 Olympic clips — для train action classifier / YOLO labels

### boxpunch-detector (small, fast start)

- https://universe.roboflow.com/markmcquade/boxpunch-detector
- Export YOLOv8 → train locally without paid Roboflow train

## Обновление эталонов из pro-статистики

Когда соберёте статистику углов с pro-клипов:

1. Посчитайте median/min/max по каждому классу
2. Обновите `ELITE_REFERENCES` в `references.ts`
3. Перезапустите dev server

Не используйте любительские записи пользователя как эталон.
