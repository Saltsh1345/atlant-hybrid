# Handoff — Atlant-Hybrid (для нового чата)

**Обновлено:** 2026-07-27  
**Назначение:** передать контекст без галлюцинаций. Читать первым: этот файл → `docs/PROGRESS.md` → `docs/passports/stage-07-intelligent-training.md` → `docs/MASTER_TZ.md`.

---

## Что это за проект

**Atlant-Hybrid** — PWA на Next.js 16 / React 19: биоскан → план → live-тренировка → аналитика.

| Маршрут | Назначение | Статус |
|---------|------------|--------|
| `/` | Google OAuth, Huawei Health | Этап 1 — заморожен |
| `/scan` | MediaPipe Pose, 2 ракурса, сохранение в Supabase | Этап 2 — заморожен |
| `/plan` | Gemini-план дня, календарь, атлас | Этап 3 — заморожен (точечно переоткрыт в Этапе 6) |
| `/workout` | Камера, VBT, жесты, сохранение сессии | Этап 4 — заморожен |
| `/analytics` | Post-workout атлас, Recharts, Gemini-резюме | Этап 5 — заморожен (принят 2026-07-26) |

**Текущий активный этап:** **Этап 6 — умный тренинг** (`docs/passports/stage-07-intelligent-training.md`), статус `В РАБОТЕ`.

**Процесс:** один этап за раз; замороженные файлы — `.cursor/rules/10-frozen-stages.mdc`; не коммитить без явной команды пользователя.

---

## Git (факт на 2026-07-27)

| | |
|---|---|
| **Ветка** | `cursor/accept-stage-5-freeze-stage-2` (запушена на origin) |
| **Последний commit на ветке** | `02b42dd` — документация приёмки Этапа 5 + Этапа 2 (4 файла) |
| **`main` на origin** | включает `03e2dbf` (QA: plan auth, scan stability, workout controls) |
| **Этап 6** | **НЕ закоммичен** — только локальные изменения (см. ниже) |

### Закоммичено и важно

- `5132f25` — реализация `/analytics`
- `03e2dbf` — `authFetch` / `routeAuth`, фиксы scan/workout/plan
- `02b42dd` — freeze docs (может быть не в `main`, только на feature-ветке)

### Локально изменено / создано (Этап 6 + мусор)

**Этап 6 (нужно коммитить отдельно, когда попросят):**

- `supabase/migrations/202607270001_stage_06_training_intelligence.sql`
- `src/lib/training/intake/**`
- `src/lib/training/bioScan/buildBioScanProfile.ts`
- `src/lib/training/science/rules.ts`
- `src/lib/training/program/buildPlanningContext.ts`
- `src/components/training/TrainingIntakeWizard.tsx`
- `src/store/trainingIntakeStore.ts`
- `docs/passports/stage-07-intelligent-training.md`
- `docs/PROGRESS.md` (частично)
- Переоткрытие Этапа 3: `src/lib/plan/types.ts`, `planContext.ts`, `generatePlanWithGemini.ts`, `PlanDashboard.tsx`

**НЕ часть Этапа 6 — не коммитить без отдельного решения:**

- `src/components/Avatar3D/**`, `src/components/three/Model.tsx`, `avatar*.ts`, `avatarStore.ts`
- правки `src/app/layout.tsx`, `ThemeProvider.tsx`, `AvatarFloorGrid.tsx`, `AvatarViewerInner.tsx`, `poseToRig.ts`, `muscleGroups.ts`
- `.cursor-tmp/`, `.cursor-video-frames/`

---

## Supabase (пользователь применил миграции)

Проверено REST API 2026-07-26 — таблицы **существуют**:

- `profiles`, `body_scans`
- `workout_sessions`, `workout_plans`
- `analytics_reports`

**Миграция stage_06 — проверка 2026-07-27 (REST):**

- Первая проверка: `GET /rest/v1/user_training_intake` → **404** — не была применена.
- Повторная проверка (после SQL Editor): все таблицы **200 OK**:
  - `user_training_intake`
  - `training_programs`
  - `workout_session_exercises`
  - `workout_set_logs`
- Колонки `workout_plans.program_id`, `week_index`, `day_index` и `workout_sessions.plan_id`, `program_id`, `session_status` — **доступны (200)**.

**Статус: миграция `202607270001_stage_06_training_intelligence.sql` применена.**

---

## Этап 6 — что уже сделано (6A, не завершён)

### Реализовано

1. **Опросник на `/plan`** (`TrainingIntakeWizard`): цель, опыт, дом/зал, дней/нед, длина программы 4–12 или «ИИ предложит».
2. **Сохранение** в `user_training_intake` (upsert по `user_id`).
3. **Полный профиль биоскана** (`buildBioScanProfile`) — не только гиперлордоз:
   - антропометрия, сегменты, осанка (углы таза/колена), % жира, комплекция, список findings → блок для Gemini.
4. **Контекст планирования** — опросник + биоскан + science rules → `generatePlanWithGemini` и `buildPlanningContext`.
5. **Схема БД** под программы 4–12 нед. и лог подходов с `weight_kg` (снаряд).

### НЕ сделано (явно следующие подэтапы)

| Подэтап | Задача |
|---------|--------|
| **6B** | Генерация **полной программы** 4–12 нед. в `training_programs`, привязка дней к `workout_plans` |
| **6C** | `/workout` **ведёт по плану**: упражнение → подход → **ввод веса снаряда** → запись в `workout_set_logs` |
| **6E** | **Коррекционный слой**: findings скана + health_concerns + notes → замены + prehab (не только гиперлордоз) |
| **6E** | **Коррекционный слой** — findings скана + health_concerns + notes → замены + prehab упражнения |

### 6E (реализован 2026-07-27)

- `src/lib/training/corrective/**` — профиль ограничений, метаданные упражнений, `applyCorrectiveLayer`
- Опросник: шаг «Здоровье», `health_concerns` в Supabase (`202607270002`)
- Engine программы и Gemini daily plan используют единый коррекционный слой
- UI: бейджи «коррекция»/«замена», причина в карточке упражнения

### Критические пробелы (не исправлять «молча»)

- `/workout` по-прежнему **не читает план**; `persistWorkoutSession` пишет `exercise: "squat"` hardcode.
- План генерируется **на один день**, не на весь мезоцикл.
- «База исследований» = **эвристики в коде** (`science/rules.ts`), не PubMed/RAG.
- Биоскан = MediaPipe 2D **оценка**, не DEXA; % жира — из Huawei/профиля.

---

## Решения пользователя (зафиксировать)

1. Этап 6 **начат** 2026-07-27.
2. ИИ + **полный биоскан** + опросник → планирование.
3. Локация: **дом / зал / оба** — фильтр упражнений.
4. **Вес тела** — автоматически; **вес снаряда** — на каждый подход (6C).
5. Программа **4–12 нед.**, ИИ может предложить длительность.
6. Этапы 0–5 **приняты и заморожены** (5-й — 2026-07-26).

---

## Заморожено (не трогать без переоткрытия)

См. `.cursor/rules/10-frozen-stages.mdc`. Кратко: auth, scan, atlas, plan (кроме файлов в паспорте 7), workout, analytics.

**Переоткрыто в Этапе 6:** только plan-файлы из паспорта stage-07.

---

## Команда для нового чата (скопировать)

```
Проект Atlant-Hybrid. Читай docs/HANDOFF.md, docs/PROGRESS.md, docs/passports/stage-07-intelligent-training.md.

Активный этап: 6 — умный тренинг (В РАБОТЕ). Этапы 0–5 заморожены.

6A сделан локально (не закоммичен): опросник /plan, buildBioScanProfile, миграция training_intelligence, расширенный контекст Gemini.

Следующий шаг по согласованию с пользователем: 6B — полная программа 4–12 нед., затем 6C — /workout по плану с весом снаряда.

Не коммитить Avatar3D и эксперименты в layout/three. Не менять замороженные этапы без паспорта.

Миграция 202607270001_stage_06_training_intelligence.sql — проверить, применена ли в Supabase.
```

---

## Проверки перед приёмкой 6A

1. SQL Editor: миграция `202607270001_stage_06_training_intelligence.sql`
2. Chrome/Edge: `/scan` → `/plan` → опросник → генерация плана
3. В опроснике блок «Биоверификация» с findings (не только гиперлордоз)
4. `npx eslint` по файлам из паспорта stage-07

---

## Ссылки

- Google Docs Этап 5: https://docs.google.com/open?id=1lelKEJiJep8yecBTxOUm0CtHxgxd-us-1CEz3mFIb4w
- AI routing: `docs/AI_ROUTING.md`
- Master TZ: `docs/MASTER_TZ.md`
