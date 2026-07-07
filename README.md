# Atlant-Hybrid — Biomechanics PWA MVP

Web-MVP биомеханического анализа на MediaPipe VBT + Gemini + React Three Fiber.

## Запуск

```bash
npm install
cp .env.local.example .env.local   # добавьте GEMINI_API_KEY
npm run dev
```

Откройте http://localhost:3000

## Huawei Health Kit (OAuth + Readiness)

1. В Huawei Developer Console создайте проект и включите Health Kit.
2. В настройках OAuth добавьте Redirect URI:
   `http://localhost:3000/api/health/huawei/callback`
3. Скопируйте `Client ID` и `Client Secret` в `.env.local`:

```bash
HUAWEI_CLIENT_ID=...
HUAWEI_CLIENT_SECRET=...
HUAWEI_REDIRECT_URI=http://localhost:3000/api/health/huawei/callback
# Optional overrides:
# HUAWEI_OAUTH_BASE=https://oauth-login.cloud.huawei.com/oauth2/v3
# HUAWEI_HEALTH_API_BASE=https://health-api.cloud.huawei.com
# HUAWEI_HEALTH_SCOPES="openid profile ..."
```

После этого в `Settings` можно нажать "Подключить Huawei".  
Перед стартом тренировки приложение обновляет данные Health Kit и считает readiness 0-100.

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
