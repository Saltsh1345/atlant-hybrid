# Atlant-Hybrid — Biomechanics PWA MVP

Web-MVP биомеханического анализа на MediaPipe VBT + Gemini + React Three Fiber.

## Запуск

```bash
npm install
cp .env.local.example .env.local   # добавьте GEMINI_API_KEY
npm run dev
```

Откройте http://localhost:3000

## 3D-аватар

Положите **один** из файлов в `public/`:

- `avatar.glb` (предпочтительно)
- `avatar.fbx` (тоже поддерживается)

Без файла показывается процедурный placeholder.

## Архитектура

| Слой | Описание |
|------|----------|
| **Zustand** | Глобальный стейт, Data Latch для жира/мышц |
| **State Machine** | `welcome → registration → dashboard → calibration → sport-select → training → analysis` |
| **Calibration** | Одноразовый расчёт состава тела + голосовой скрипт |
| **Training** | Только кинематика VBT (углы, скорость) — без пересчёта жира |
| **Gemini** | Финальный анализ тренировки (`/api/gemini/analyze`) |

## Data Latching

`latchedBody` и `bodyDataLocked` устанавливаются **один раз** в `latchBodyData()` на этапе калибровки. Во время тренировки обновляется только `kinematics`.

## Стек

- Next.js + React + Tailwind + Framer Motion
- @react-three/fiber + drei
- @mediapipe/tasks-vision
- @google/generative-ai
- Zustand
- window.speechSynthesis (голосовой ассистент)
