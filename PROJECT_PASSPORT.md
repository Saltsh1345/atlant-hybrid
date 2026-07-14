# Паспорт проекта ATLANT Hybrid

**Версия продукта:** MVP 0.1.0  
**Дата паспорта:** 14 июля 2026  
**Ветка / HEAD:** `main` @ `4411306`  
**Локально:** http://localhost:3000  
**Продакшен:** https://atlant-hybrid.vercel.app  
**Репозиторий:** https://github.com/Saltsh1345/atlant-hybrid  

---

## 1. Название / стек / URL

| | |
|--|--|
| **Название** | Atlant-Hybrid (ATLANT Biomechanics PWA) |
| **Суть** | Веб-PWA биомеханического анализа через камеру: скан тела → цифровой двойник → тренировки (сила / бокс / теннис) → план и анализ |
| **Frontend** | Next.js 16.2, React 19, Tailwind 4, Framer Motion |
| **Состояние** | Zustand (persist в `localStorage`) |
| **Поза / VBT** | `@mediapipe/tasks-vision` |
| **3D twin** | Three.js, `@react-three/fiber`, `@react-three/drei` |
| **ИИ** | `@google/generative-ai` (Gemini) |
| **Опционально** | Huawei Health Kit OAuth, Roboflow/Ultralytics YOLO |
| **Голос** | Web Speech API (`speechSynthesis`) |
| **Графики** | Recharts |
| **Деплой** | Vercel ← push в `main` |

---

## 2. Цель продукта

Дать спортсмену и тренеру **один веб-контур без внешних датчиков**:

1. **Биоскан** — поза + (опционально) Gemini vision → состав тела, осанка, latch данных.
2. **Цифровой двойник** — 3D-аватар с зонами жира/мышц, живой трекинг позы, пульс/стресс (оценка).
3. **Тренировка** — VBT (скорость), счётчик повторов, drill-режим бокса/тенниса.
4. **Диагностика → план** — weak zones + каталог упражнений + недельная программа.
5. **ИИ-коучинг** — Gemini: разбор сессии, план, body-scan JSON.

Целевой UX: светлый «инженерный» HealthTech HUD (cyan wireframe), опционально dark theme; референс — ATLANT Biomechanics Engineering (PDF вне репо).

---

## 3. Хронология работ (от начала до 2026-07-14)

Источники: git `main` (26 коммитов), `README.md`, предыдущий паспорт `f602f9b`, agent transcripts.

### Этап A — фундамент MVP (2026-07-02)

| Когда | Что |
|-------|-----|
| `1bff087` | Initial commit: полный flow welcome → registration → dashboard → calibration → sport → training → analysis; MediaPipe + VBT; Zustand Data Latch; PWA; Gemini analyze; 3D avatar |
| `5a57c22` | Фикс таймаута Gemini на Vercel (короткий prompt) |
| `81b7110` | Выбор спорта на главной; скан тела **не обязателен** |
| `3a06de3` / `1ed2d5d` | Модели Gemini (primary → `gemini-3.5-flash`) |
| `97385d3` | Fix TypeScript build для старта тренировки |
| `f602f9b` | Первый `PROJECT_PASSPORT.md` |

Параллельно в чатах: отмена раннего «киберпанк»-шелла → пересборка под Light HealthTech PWA.

### Этап B — дашборд, twin, Gemini body-scan (2026-07-03 … 07-04)

| Коммит | Содержание |
|--------|------------|
| `7716924` | Responsive dashboard editor, SportHUD, улучшения Gemini |
| `f2fc943` | Bump PWA cache / redeploy |
| `3795b22` | Модульный дашборд, strike VFX, Gemini coaching |
| `d620623` | Anatomical `avatar.glb`, загрузка twin на dashboard/training |
| `bf5acc1` | Gemini body-scan API, zone-based twin, technique coaching plans |

Проблемы того периода (из feedback): жёлтый/«страшный» twin на одном Mixamo mesh; latch слишком рано; одежда не детектилась → vertex painting, latch в конце скана, эвристика одежды, PiP-двойник.

### Этап C — Huawei, дизайн-система, Apex UI (2026-07-07 … 07-08)

| Коммит | Содержание |
|--------|------------|
| `a3bad65` | Huawei Health readiness, dark/light themes, UI kit |
| `e7476cb` | Apexform overview, hologram twin shader, sport picker |

### Этап D — биоскан mobile, камера, диагностика, планы (2026-07-10)

| Коммит | Содержание |
|--------|------------|
| `c27ea6d` | Mobile bio-scan, video diagnostics, training plan (`programEngine`), camera switch |
| `b102615` | Phone bio-scan UX когда задняя камера скрывает дисплей (`PhoneScanPreflight`: selfie vs tripod + голос/beeps) |

Дополнительно в коде/чатах: `deviceProfile`, силуэт/дистанция (оптический дальномер, **не LiDAR**), coach camera без агрессивного auto-zoom, калибровка под ноутбук vs телефон.

### Этап E — каталог упражнений и аудит (2026-07-13)

| Коммит | Содержание |
|--------|------------|
| `03445a7` | Каталог упражнений расширен (~6 → **43**): hypertrophy, boxing S&C, tennis S&C |
| `3a00b02` | Fix scan / training plan / state / API reliability (full audit pass) |

После latch: `refreshVideoDiagnostics()` + `refreshTrainingProgram()`.

### Этап F — живой двойник, rPPG, framing (2026-07-14)

| Коммит | Содержание |
|--------|------------|
| `0339fc9` | Twin: жир/мышцы читаются без orange blobs (`compositionMaterials`) |
| `003b224` | Twin Live: **3 колонки** — twin слева, камера центр, vitals справа |
| `c8fbcc8` / `8ae2e7d` | Fix React «Maximum update depth» — landmarks в refs, throttle vitals |
| `4fb116b` / `f0e1d13` | Full-body framing (`FitFullBodyCamera`), камера twin дальше от модели |
| `c2dc333` | Усиление webcam rPPG: face ROI, spectral BPM, confidence-gated fallback |
| `4411306` | Ускорение первого lock: ~6 с истории, provisional refining status |

---

## 4. Что умеет сейчас

### 4.1. Биоскан (Calibration)

- MediaPipe Pose: front / turn L-R / squat; hold-кадры; голосовой коуч.
- **PhoneScanPreflight:** режим селфи (front cam) vs подставка/штатив (rear + голос + beeps).
- Силуэт / distance coach; профили laptop vs phone/tablet.
- Samples по фазам → `bodyScanPayload` → опционально `POST /api/gemini/body-scan`.
- Эвристика одежды (`clothingDetection` / `scanAnalysis`) — не CV-классификатор.
- Рост/вес: профиль пользователя + pose-эвристики (`statureEstimate`, anthropometry).
- **Data Latch:** `latchBodyData()` один раз → `bodyDataLocked`; перескан через `unlockForRescan()`.

### 4.2. Цифровой двойник

- GLB/FBX аватар; нейтральный twin до скана; после latch — зоны жира (peach) / мышц (cyan) через `compositionMaterials`.
- **Twin Live:** layout twin | camera | pulse+stress.
- Live pose → rig; `FitFullBodyCamera` для узкой колонки.
- Dashboard / training PiP twin panels.

### 4.3. Пульс / стресс

- **rPPG** с веб-камеры (`livePulse.ts`): ROI лица, bandpass, BPM + confidence.
- Fallback: кинематика движения, опционально Huawei Health.
- UI-статусы: accumulating → refining → ok / low_light / motion / weak.
- **Честно:** wellness-оценка, **не медицинский прибор**.

### 4.4. Тренировки

| Спорт | Возможности |
|-------|-------------|
| **Сила** | Присед / жим / выпады + расширенный каталог; VBT; rep counter; form score |
| **Бокс** | Drill protocol (jab/cross/hook…), фиксации скорости/точности, SportDrillOverlay |
| **Теннис** | Drill swings (forehand/backhand/serve), те же drill-пайплайны |
| **План** | `programEngine` + `exerciseCatalog` (43 упражнения), `TrainingProgramPanel` |
| **Диагностика** | `videoDiagnostics` → weak zones → подбор упражнений |

### 4.5. ИИ / интеграции

- Gemini: `/api/gemini/analyze`, `/analyze-session`, `/body-scan`, `/status`.
- Модели: `gemini-3.5-flash` → `2.5-flash` → `2.0-flash`.
- Huawei Health: OAuth + readiness score (Settings → «Подключить Huawei»).
- YOLO (Roboflow/Ultralytics): опциональная классификация действий — нужен API key.

### 4.6. Прочее UX

- Welcome → быстрый старт спорта без скана.
- Bottom nav; settings (голос, сброс, Huawei).
- PWA (manifest + SW); dark/light theme store.
- Модульный/ресайзабельный dashboard (react-grid-layout).

---

## 5. Архитектура (кратко)

### 5.1. Фазы (state machine)

```
welcome → registration | sport-select | calibration | dashboard | training
dashboard ↔ settings | twin-live | calibration | training
training → analysis → dashboard | sport-select | training
```

Файл: `src/lib/stateMachine.ts`.

### 5.2. Слои

```
screens/          UI по фазам
store/            useAppStore (latch, diagnostics, program, sessions)
hooks/            usePoseTracker, useSportDrill, useCameraDevice, …
lib/bio/          скан-качество, одежда, stature, signature
lib/calibration/  pose guide, scan analysis, body simulator, bodyScanPayload
lib/camera/       device profile, silhouette, beeps, distance, autoFrame
lib/pose/         MediaPipe, VBT, reps, form, landmarks → rig
lib/training/     drill, catalog, programEngine, session log
lib/vitals/       livePulse (rPPG + stress estimate)
lib/diagnostics/  videoDiagnostics, poseAsymmetry
lib/three/        compositionMaterials, fitModel, muscleGroups
lib/ai/           Gemini, speech, workoutPlan, YOLO map
lib/health/       Huawei OAuth + readiness
components/three/ AvatarViewer + FitFullBodyCamera
```

### 5.3. Data Latch

- Калибровка пишет `latchedBody` + `bodyDataLocked = true`.
- Тренировка обновляет только `kinematics` (углы, скорость, усталость).
- После latch автоматически пересчитываются diagnostics и training program.

### 5.4. API

| Endpoint | Назначение |
|----------|------------|
| `POST /api/gemini/analyze` | Итог тренировки + план |
| `POST /api/gemini/analyze-session` | Разбор сессии |
| `POST /api/gemini/body-scan` | Vision body-scan |
| `GET /api/gemini/status` | Ключ / модель |
| `GET/POST /api/health/*` | Huawei OAuth, metrics, readiness |

---

## 6. Ключевые файлы

| Область | Путь |
|---------|------|
| Store | `src/store/useAppStore.ts` |
| State machine | `src/lib/stateMachine.ts` |
| Калибровка UI | `src/components/screens/CalibrationScreen.tsx` |
| Phone preflight | `src/components/calibration/PhoneScanPreflight.tsx` |
| Twin Live | `src/components/screens/TwinLiveScreen.tsx` |
| Training | `src/components/screens/TrainingScreen.tsx` |
| Dashboard | `src/components/screens/DashboardScreen.tsx` |
| Twin materials | `src/lib/three/compositionMaterials.ts` |
| Twin framing | `src/components/three/AvatarViewerInner.tsx` (`FitFullBodyCamera`) |
| rPPG | `src/lib/vitals/livePulse.ts` |
| Каталог | `src/lib/training/exerciseCatalog.ts` (43) |
| План | `src/lib/training/programEngine.ts` |
| Диагностика | `src/lib/diagnostics/videoDiagnostics.ts` |
| Drill | `src/lib/training/drillProtocol.ts`, `hooks/useSportDrill.ts` |
| Gemini models | `src/lib/ai/geminiModels.ts` |
| Huawei | `src/lib/health/huawei.ts` |
| Env example | `.env.local.example` |

---

## 7. Ограничения и честность

| Тема | Реальность |
|------|------------|
| **rPPG / стресс** | Оценка для wellness UX. Не FDA/CE, не диагноз, не замена пульсометру/врачу. |
| **Глубина / дистанция** | Нет LiDAR/ToF в браузере. Оценка по позе, ширине плеч, `deviceProfile`. |
| **Состав тела** | Симуляция + эвристики + (опц.) Gemini vision — не DEXA/InBody. |
| **Одежда** | Heuristic по силуэту/landmarks, не нейросеть-классификатор. |
| **Рост/вес** | В основном из профиля пользователя; камера уточняет косвенно. |
| **YOLO** | Работает только при настроенных Roboflow/Ultralytics ключах. |
| **Huawei** | Нужны Client ID/Secret и redirect URI в консоли разработчика. |
| **Gemini** | Без `GEMINI_API_KEY` — fallback-планы; на Vercel лимит ~10 с (hobby). |
| **Аватар** | Без `public/avatar.glb` (или `.fbx`) — процедурный placeholder. |
| **Combo-удары** | Одна фиксация на drill-команду (не полный combo-разбор). |

---

## 8. Env / настройка

Скопировать `.env.local.example` → `.env.local`.

### Обязательно для ИИ

```bash
GEMINI_API_KEY=...
# опционально:
# GEMINI_ANALYSIS_TIMEOUT_MS=90000
```

### Huawei Health (опционально)

```bash
HUAWEI_CLIENT_ID=...
HUAWEI_CLIENT_SECRET=...
HUAWEI_REDIRECT_URI=http://localhost:3000/api/health/huawei/callback
# HUAWEI_OAUTH_BASE=...
# HUAWEI_HEALTH_API_BASE=...
# HUAWEI_HEALTH_SCOPES=...
```

### YOLO / Roboflow (опционально)

```bash
YOLO_PROVIDER=roboflow
ROBOFLOW_API_KEY=...
ROBOFLOW_PROJECT=atlant-actions
ROBOFLOW_VERSION=1
ROBOFLOW_CONFIDENCE=0.4
YOLO_TIMEOUT_MS=9000
```

### Ассеты

Положить в `public/`: `avatar.glb` (предпочтительно) или `avatar.fbx`.

### Запуск

```bash
npm install
cp .env.local.example .env.local
npm run dev
# http://localhost:3000
```

Прод: push в `main` → Vercel auto-deploy. `GEMINI_API_KEY` должен быть в Vercel Environment Variables.

---

## 9. Как проверить (localhost flows)

### A. Быстрый старт тренировки

1. Открыть http://localhost:3000  
2. На Welcome выбрать **Бокс / Теннис / Сила**  
3. Пройти тренировку → Analysis (Gemini или fallback)

### B. Биоскан → двойник

1. Dashboard → **Скан тела**  
2. На телефоне: выбрать selfie или tripod  
3. Пройти позы до latch (`bodyDataLocked`)  
4. Dashboard: метрики тела + twin  
5. **Twin Live**: 3 колонки, пульс/стресс, full-body twin

### C. План тренировок

1. После успешного скана — панели Video Diagnostics + Training Program  
2. Убедиться, что в плане упражнения из расширенного каталога (не только squat/bench/lunge)

### D. Huawei (если ключи есть)

1. Settings → Подключить Huawei  
2. OAuth → вернуться → readiness до старта тренировки

### E. Статус Gemini

```text
GET /api/gemini/status
```

---

## 10. Открытый backlog

### Приоритет 1 — стабильность

- [ ] Стабильность калибровки на «сложных» устройствах (ложные блокировки позы)
- [ ] Mobile rear-camera: дальнейший polish режима штатива (экран не виден)
- [ ] Smoke E2E на Vercel: welcome → бокс → удар → analysis → Gemini
- [ ] Мониторинг `/api/gemini/status` на проде (3.5 vs fallback)

### Приоритет 2 — продукт

- [ ] Combo-фиксации (два удара в одной команде)
- [ ] Точнее jab vs cross по L/R wrist
- [ ] Структурированный JSON-план Gemini → карточки UI
- [ ] Подсветка слабых мышц на twin после analysis
- [ ] Draco/сжатие аватара, если вес файла снова вырастет

### Приоритет 3 — polish / infra

- [ ] Удалить мёртвый код (`BiomechScanOverlay` и т.п., если не используется)
- [ ] Unit-тесты: `repCounter`, `drillResults`, `poseAnalysis`, `livePulse`
- [ ] CI: `npm run build` + lint на push
- [ ] Sentry / analytics
- [ ] i18n (сейчас RU)

### Известные риски

| Риск | Комментарий |
|------|-------------|
| Vercel 10s timeout | Длинный Gemini → fallback; Pro / streaming |
| API key в чатах | Ротация `GEMINI_API_KEY` при утечке |
| Теннис drill | Меньше полевого теста, чем бокс |

---

## 11. Коммиты-вехи

| SHA | Дата | Веха |
|-----|------|------|
| `1bff087` | 2026-07-02 | Initial MVP |
| `5a57c22` | 2026-07-02 | Gemini timeout fix (Vercel) |
| `81b7110` | 2026-07-02 | Sport picker; optional scan |
| `1ed2d5d` | 2026-07-02 | Gemini 3.5 Flash primary |
| `f602f9b` | 2026-07-02 | Первый паспорт проекта |
| `7716924` | 2026-07-03 | Dashboard editor + SportHUD |
| `3795b22` | 2026-07-03 | Modular dashboard, strike VFX |
| `d620623` | 2026-07-04 | Anatomical avatar.glb |
| `bf5acc1` | 2026-07-04 | Gemini body-scan + zone twin |
| `a3bad65` | 2026-07-07 | Huawei Health + design system |
| `e7476cb` | 2026-07-08 | Apexform UI + hologram twin |
| `c27ea6d` | 2026-07-10 | Mobile scan, diagnostics, programEngine |
| `b102615` | 2026-07-10 | Phone selfie/tripod bio-scan UX |
| `03445a7` | 2026-07-13 | Exercise catalog → ~43 |
| `3a00b02` | 2026-07-13 | Audit: scan/plan/state/API |
| `0339fc9` | 2026-07-14 | Twin materials (no orange blobs) |
| `003b224` | 2026-07-14 | 3-column Twin Live + vitals |
| `8ae2e7d` | 2026-07-14 | Max update depth → landmarks in refs |
| `4fb116b` | 2026-07-14 | FitFullBodyCamera + live pulse/stress |
| `c2dc333` | 2026-07-14 | Strengthen rPPG |
| `4411306` | 2026-07-14 | Faster rPPG provisional lock |

Полная история: 26 коммитов на `main` от `1bff087` до `4411306`.

---

## 12. Ссылки

- **GitHub:** https://github.com/Saltsh1345/atlant-hybrid  
- **Vercel:** https://atlant-hybrid.vercel.app  
- **Gemini API keys:** https://aistudio.google.com/apikey  
- **ТЗ / референс:** ATLANT_Biomechanics_Engineering.pdf (вне репозитория)

---

*Паспорт обновлён 2026-07-14 по кодовой базе, git log и истории разработки. Обновлять при каждом крупном релизе или смене архитектуры.*
