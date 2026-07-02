# Паспорт проекта Atlant-Hybrid

**Версия:** MVP 0.1.0  
**Дата паспорта:** 2 июля 2026  
**Продакшен:** https://atlant-hybrid.vercel.app  
**Репозиторий:** https://github.com/Saltsh1345/atlant-hybrid  

---

## 1. Назначение

**Atlant-Hybrid** — веб-PWA для биомеханического анализа движений через камеру смартфона/ноутбука. Без внешних датчиков: MediaPipe Pose + VBT (velocity-based training) + 3D digital twin + голосовой ИИ-тренер (Gemini).

**Целевой UX (по ТЗ / PDF Atlant Biomechanics):**
- Светлый «инженерный» интерфейс, cyan wireframe, HUD-метки
- Скан тела → цифровой двойник (жир на торсе, мышцы на конечностях)
- Тренировки: силовые, бокс, теннис
- Фиксация ударов/движений → скорость и точность → план от Gemini

---

## 2. Стек технологий

| Слой | Технология |
|------|------------|
| Frontend | Next.js 16, React 19, Tailwind 4, Framer Motion |
| Состояние | Zustand (persist в localStorage) |
| Поза / VBT | @mediapipe/tasks-vision |
| 3D twin | Three.js, @react-three/fiber, @react-three/drei |
| ИИ-анализ | @google/generative-ai (Gemini API) |
| Голос | Web Speech API (`speechSynthesis`) |
| Графики | Recharts |
| Деплой | Vercel + GitHub |

**Переменные окружения:**
- `GEMINI_API_KEY` — обязательна для ИИ-анализа (Vercel → Settings → Environment Variables)

---

## 3. Архитектура приложения

### 3.1. Машина состояний (фазы)

```
welcome → registration → dashboard
welcome → sport-select → training → analysis
welcome → calibration → dashboard / sport-select
dashboard ↔ settings / twin-live / calibration
analysis → dashboard / sport-select
```

Файл: `src/lib/stateMachine.ts`

### 3.2. Data Latch (состав тела)

- `latchedBody` и `bodyDataLocked` записываются **один раз** при калибровке
- Во время тренировки обновляется только `kinematics` (углы, скорость, усталость)
- Файл: `src/store/useAppStore.ts` → `latchBodyData()`

### 3.3. API-маршруты

| Endpoint | Назначение |
|----------|------------|
| `POST /api/gemini/analyze` | Итог тренировки + план (Gemini) |
| `GET /api/gemini/status` | Проверка ключа и доступности модели |

### 3.4. Модели Gemini (текущие)

Приоритет в `src/lib/ai/geminiModels.ts`:
1. `gemini-3.5-flash`
2. `gemini-2.5-flash`
3. `gemini-2.0-flash`

---

## 4. Экраны и функции

| Экран | Файл | Что делает |
|-------|------|------------|
| **Главная** | `WelcomeScreen.tsx` | Быстрый выбор спорта (бокс/теннис/силовые), опциональный скан |
| **Профиль** | `RegistrationScreen.tsx` | Рост, вес, возраст, цель, травмы |
| **Дашборд** | `DashboardScreen.tsx` | Метрики тела, twin, история, Gemini status |
| **Калибровка** | `CalibrationScreen.tsx` | Pose-driven скан, muscle/fat overlay, 3D twin |
| **Выбор спорта** | `SportSelectScreen.tsx` | Повторный выбор дисциплины |
| **Тренировка** | `TrainingScreen.tsx` | Камера, VBT, drill-режим для бокса/тенниса |
| **Анализ** | `AnalysisScreen.tsx` | Статистика, фиксации ударов, ответ Gemini |
| **Настройки** | `SettingsScreen.tsx` | Голос, сброс данных |
| **Twin Live** | `TwinLiveScreen.tsx` | Живой 3D-двойник |

---

## 5. Что сделано за всё время

### 5.1. Базовый MVP (initial commit)

- [x] Полный user flow: welcome → регистрация → дашборд → калибровка → спорт → тренировка → анализ
- [x] MediaPipe pose tracking + VBT (скорость запястья, углы колена/локтя, усталость)
- [x] Силовые: присед, жим, выпады + счётчик повторов
- [x] Бокс / теннис: базовый трекинг
- [x] 3D-аватар (FBX/GLB Mixamo, ~35 МБ `public/avatar.fbx`)
- [x] Zustand store с persist
- [x] PWA: manifest, service worker
- [x] Gemini analyze + fallback при недоступности API
- [x] Голосовой ассистент (команды, подсказки)
- [x] Дашборд: история сессий, графики VBT, readiness, локальный план

### 5.2. UI / визуал (биомеханический стиль)

- [x] Светлая тема, engineering HUD (`atlant-hud-pill`, `atlant-edge-hud`, `atlant-metric-card`)
- [x] `LiveScanGrid` — перспективная сетка на полу при тренировке
- [x] `MuscleFatOverlay` — подсветка мышц/жира на видео (без stick-skeleton)
- [x] Убран stick-skeleton overlay с калибровки
- [x] `BiomechTwinPanel` — панель 3D twin с HUD `[BIOMETRICS: STABLE]`
- [x] `compositionMaterials.ts` — покраска зон тела на single-mesh FBX (торс amber/жир, конечности green/мышцы) + cyan wireframe
- [x] Редизайн дашборда (DigitalTwinCard, MuscleReadinessCard, AiPlanCard)
- [x] Исправлен дублирующий import Button в DashboardScreen

### 5.3. Калибровка / pose analysis

- [x] `poseAnalysis.ts` — live-анализ позы (depth, yaw, full body)
- [x] `poseGuide.ts` — ожидание позы без auto-skip по таймеру, 12 hold-кадров
- [x] `scanAnalysis.ts` — строже проверка full-body, понятные сообщения об ошибках
- [x] Разделение «голова не видна» и «встаньте в кадр»
- [x] Детекция поворота через shoulder z-depth + width
- [x] Center pose через `torsoYawX` с ослабленными порогами
- [x] После скана: панель fat/muscle stats + twin справа

### 5.4. Бокс / теннис — drill-режим

- [x] `drillProtocol.ts` — 4 команды бокса, 3 тенниса
- [x] `useSportDrill.ts` — state machine: instruction → countdown → active → fixation → rest → complete
- [x] **Исправлен баг зависания на «ИНСТРУКЦИЯ»** (startedRef блокировал эффект)
- [x] `phaseRef` — без stale closure в `reportHit`
- [x] `detectDrillStrike` / `detectDrillSwing` — сниженные пороги скорости (1.4+ м/с)
- [x] `drillResults.ts` — фиксация по каждой команде (скорость, точность, зачтено/нет)
- [x] `SportDrillOverlay` — UI фаз + кнопка «Анализ и план тренировки»
- [x] Передача drill fixations в Gemini prompt

### 5.5. Gemini / анализ

- [x] Расширенный prompt: слабые места, план на 2 тренировки, фокус безопасности
- [x] Таблица фиксаций ударов на экране анализа
- [x] `/api/gemini/status` — диагностика ключа и модели
- [x] Обработка ошибок с показом «Причина fallback»
- [x] Оптимизация под Vercel timeout (короткий prompt, maxOutputTokens, deadline 9.5с)
- [x] Миграция моделей: убран deprecated `gemini-2.0-flash-lite`, primary → `gemini-3.5-flash`
- [x] `geminiModels.ts` — централизованный список моделей

### 5.6. UX / навигация

- [x] **Главная страница** — выбор тренировки сразу (без обязательного скана тела)
- [x] `SportPicker` — общий компонент выбора спорта
- [x] `ensureProfile()` — дефолтный профиль для быстрого старта
- [x] Скан тела сделан **опциональным**
- [x] Bottom nav: Главная / Дашборд / Тренировка / Настройки (без блокировки по скану)
- [x] Дашборд: «Начать тренировку» всегда доступна

### 5.7. Деплой

- [x] GitHub: `Saltsh1345/atlant-hybrid`
- [x] Vercel: https://atlant-hybrid.vercel.app
- [x] `GEMINI_API_KEY` в Vercel Environment Variables
- [x] Исправлен TypeScript build (`SportSelectScreen` / `setSelectedExercise`)

---

## 6. Известные проблемы (текущие)

| Проблема | Статус | Комментарий |
|----------|--------|-------------|
| Калибровка тела глючит | 🔴 Открыто | Пользователь сообщал о зависаниях на pose-валидации; частично смягчено, нужна доработка |
| Gemini 3.5 на Vercel | 🟡 Проверить | Если 3.5 недоступен на ключе — fallback на 2.5; нужен мониторинг `/api/gemini/status` |
| Vercel timeout 10с | 🟡 Риск | Длинный ответ Gemini может не успеть; рассмотреть streaming или Vercel Pro (60с) |
| `avatar.fbx` 35 МБ | 🟡 | Медленная первая загрузка; лучше конвертировать в GLB + Draco |
| Ключ API в чате | 🔴 Безопасность | Рекомендуется ротация `GEMINI_API_KEY` |
| `BiomechScanOverlay` | 🟡 | Возможно не используется — кандидат на удаление |
| Жёлтый placeholder twin | 🟡 | Без FBX показывается процедурная модель — не соответствует PDF-стилю |
| Combo-удары (джеб+кросс) | 🟡 | Одна фиксация на команду, не два удара |
| Теннис drill | 🟡 | Меньше тестировался чем бокс |

---

## 7. Что нужно сделать дальше

### Приоритет 1 — стабильность (критично)

- [ ] **Починить калибровку тела** — стабильный проход всех шагов (turn left/right, center, squat) без ложных блокировок
- [ ] **Проверить Gemini 3.5** на проде после последнего деплоя; при 404 — зафиксировать рабочую модель в `geminiModels.ts`
- [ ] **E2E smoke-тест** на Vercel: главная → бокс → 1 удар → анализ → ответ Gemini

### Приоритет 2 — продукт

- [ ] Улучшить **точность детекции ударов** (jab vs cross по руке, L/R wrist)
- [ ] Combo-команда: фиксация **двух ударов** в одном раунде
- [ ] Структурированный вывод Gemini (JSON → карточки плана, а не сплошной текст)
- [ ] Показ **слабых мышц на 3D twin** после анализа
- [ ] Конвертация `avatar.fbx` → `avatar.glb` (сжатие, быстрая загрузка)

### Приоритет 3 — polish

- [ ] Убрать мёртвый код (`BiomechScanOverlay`, `PoseOverlay` если не нужен)
- [ ] Единый engineering-стиль на всех экранах (welcome уже обновлён, twin-live — проверить)
- [ ] Офлайн-fallback план тренировки без Gemini (расширить `workoutPlan.ts`)
- [ ] i18n / локализация (сейчас только RU)
- [ ] Unit-тесты: `repCounter`, `drillResults`, `poseAnalysis`

### Приоритет 4 — инфраструктура

- [ ] CI: GitHub Actions — `npm run build` + lint на каждый push
- [ ] Vercel preview deployments для PR
- [ ] Мониторинг ошибок (Sentry / Vercel Analytics)
- [ ] Документация API для внешних интеграций

---

## 8. Структура репозитория (ключевые папки)

```
src/
├── app/                    # Next.js App Router, API routes
├── components/
│   ├── screens/            # Экраны приложения
│   ├── training/           # Drill, SportPicker, overlays
│   ├── camera/             # Overlays на видео
│   ├── three/              # 3D avatar viewer
│   ├── visual/             # BiomechTwinPanel, LiveScanGrid
│   ├── hud/                # Training HUD
│   └── dashboard/          # Карточки дашборда
├── hooks/                  # usePoseTracker, useSportDrill, useAvatarAsset
├── lib/
│   ├── ai/                 # gemini, speech, workoutPlan
│   ├── calibration/        # scan, pose guide, body simulator
│   ├── pose/                 # VBT, rep counter, form score
│   ├── training/           # drill protocol, drill results
│   └── three/              # materials, fit model
├── store/                  # useAppStore (Zustand)
└── types/                  # TypeScript types
public/
├── avatar.fbx              # 3D модель (~35 МБ)
├── manifest.json           # PWA
└── sw.js                   # Service worker
```

---

## 9. Как запустить локально

```bash
npm install
cp .env.local.example .env.local   # GEMINI_API_KEY=...
npm run dev
# http://localhost:3000
```

**Продакшен:** push в `main` → автодеплой Vercel.

---

## 10. История коммитов

| Коммит | Описание |
|--------|----------|
| `1bff087` | Initial commit: Atlant-Hybrid MVP |
| `5a57c22` | Fix Gemini timeout on Vercel |
| `81b7110` | Sport picker на главной, скан опционален |
| `3a06de3` | Fix Gemini models (убран flash-lite) |
| `1ed2d5d` | Gemini 3.5 Flash primary |
| `97385d3` | Fix TypeScript build (SportSelectScreen) |

---

## 11. Контакты и ссылки

- **GitHub:** https://github.com/Saltsh1345/atlant-hybrid  
- **Vercel:** https://atlant-hybrid.vercel.app  
- **Gemini API:** https://aistudio.google.com/apikey  
- **ТЗ / референс:** ATLANT_Biomechanics_Engineering.pdf (вне репозитория)

---

*Документ сгенерирован по состоянию кодовой базы и истории разработки. Обновляйте при каждом крупном релизе.*
