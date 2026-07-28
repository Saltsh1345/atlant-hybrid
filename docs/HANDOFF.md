# Handoff — Atlant-Hybrid (для нового чата)

**Обновлено:** 2026-07-28  
**Назначение:** передать контекст без галлюцинаций. Читать первым: этот файл → `docs/PROGRESS.md` → `docs/passports/stage-07-intelligent-training.md` → `docs/MASTER_TZ.md`.

---

## Что это за проект

**Atlant-Hybrid** — PWA на Next.js 16 / React 19: биоскан → план → live-тренировка → аналитика.

| Маршрут | Назначение | Статус |
|---------|------------|--------|
| `/` | Google OAuth, Huawei Health | Этап 1 — заморожен |
| `/scan` | MediaPipe Pose, 2 ракурса, сохранение в Supabase | Этап 2 — заморожен |
| `/plan` | Опросник, программа, Gemini-план дня, календарь, атлас | Этап 3 + 6 — plan заморожен, переоткрыт в 6 |
| `/workout` | План дня, подходы, вес снаряда, камера, VBT | Этап 4 + 6C |
| `/analytics` | Post-workout атлас, Recharts, Gemini-резюме | Этап 5 — заморожен |

**Текущий активный этап:** **Этап 6 — умный тренинг** (`docs/passports/stage-07-intelligent-training.md`), статус **`ОЖИДАЕТ ПРИЁМКИ`** (6A + 6B + 6C + 6E).

**Процесс:** один этап за раз; замороженные файлы — `.cursor/rules/10-frozen-stages.mdc`; не коммитить без явной команды пользователя.

---

## Git (факт на 2026-07-28)

| | |
|---|---|
| **Ветка** | `cursor/accept-stage-5-freeze-stage-2` (запушена на origin) |
| **Последний commit Этапа 6** | `3282625` — «Add Stage 6 intelligent training with corrective exercise layer.» |
| **`main` на origin** | **не содержит** Этап 6 (ветка не смержена) |
| **Локально не закоммичено** | fallback `healthConcernsCodec.ts`, правки load/persist intake; Avatar3D/layout/three эксперименты |

### Закоммичено в Этапе 6 (41 файл, `3282625`)

- Миграции `202607270001`, `202607270002`
- `src/lib/training/**` (intake, bioScan, program, corrective, science)
- `src/components/training/TrainingIntakeWizard.tsx`
- Переоткрытие plan/workout: `PlanDashboard`, `generatePlanWithGemini`, `WorkoutLiveScreen`, API routes
- `docs/passports/stage-07-intelligent-training.md`, `docs/PROGRESS.md`

### НЕ часть Этапа 6 — не коммитить без отдельного решения

- `src/components/Avatar3D/**`, `src/components/three/Model.tsx`, `avatar*.ts`, `avatarStore.ts`
- правки `src/app/layout.tsx`, `ThemeProvider.tsx`, `AvatarFloorGrid.tsx`, `AvatarViewerInner.tsx`, `poseToRig.ts`, `muscleGroups.ts`
- `.cursor-tmp/`, `.cursor-video-frames/`

---

## Supabase — миграции

| Миграция | Статус (REST, 2026-07-28) |
|----------|---------------------------|
| `202607270001_stage_06_training_intelligence.sql` | **Применена** — таблицы и колонки 200 OK |
| `202607270002_stage_06_health_concerns.sql` | **Не применена** — колонка `health_concerns` → REST 400 |

**Fallback в коде (2026-07-28):** если колонки нет, `health_concerns` кодируются в `notes` (`healthConcernsCodec.ts`); load/persist/server автоматически переключаются. После применения миграции 002 fallback не мешает — используется нормальная колонка.

---

## Этап 6 — что сделано

| Подэтап | Содержание |
|---------|------------|
| **6A** | Опросник на `/plan`, `user_training_intake`, полный `buildBioScanProfile`, контекст Gemini |
| **6B** | Engine-программа 4–12 нед., `training_programs`, кнопка «СОЗДАТЬ ПРОГРАММУ», календарь |
| **6C** | `/workout` по плану дня, подходы, `weight_kg` → `workout_set_logs` |
| **6E** | Коррекционный слой: findings скана + `health_concerns` + notes → замены + prehab; шаг «Здоровье» в опроснике |

### Источники данных (важно)

| Действие | Источник |
|----------|----------|
| «Создать программу» | **Engine** (`source: "engine"`), шаблоны сплитов + каталог |
| «Сгенерировать план» (день) | **Gemini** + post-processing `applyCorrectiveLayer` |
| Демо техники | **Нет** — только текстовые `hints` в каталоге |
| «База исследований» | Эвристики `science/rules.ts`, не RAG |

### Не входит в Этап 6 (6D — следующий)

- Прогрессия из истории `workout_set_logs`
- Интеграция тоннажа в `/analytics`
- Авто-продвижение `current_week` программы

---

## Пошаговая приёмка (для пользователя)

### Шаг 1 — Supabase SQL Editor (2 мин)

1. Открыть [Supabase Dashboard](https://supabase.com/dashboard) → проект → **SQL Editor**.
2. Вставить и выполнить содержимое файла `supabase/migrations/202607270002_stage_06_health_concerns.sql`:

```sql
alter table public.user_training_intake
  add column if not exists health_concerns jsonb not null default '[]'::jsonb;
```

3. Проверка: Table Editor → `user_training_intake` → колонка `health_concerns` есть.

> Без шага 1 приложение всё равно работает (fallback в notes), но лучше применить миграцию.

### Шаг 2 — Запуск dev-сервера

```powershell
cd C:\Users\Arman\atlant-hybrid
npm run dev
```

Открыть `http://localhost:3000`, войти через Google.

### Шаг 3 — Опросник и биоскан (5 мин)

1. `/scan` — пройти скан (или использовать уже сохранённый).
2. `/plan` — если опросник не пройден, пройти все шаги, включая **«Здоровье»** (отметить 1–2 ограничения).
3. Убедиться, что блок «Биоверификация» показывает findings (не только гиперлордоз).

### Шаг 4 — Программа (3 мин)

1. Нажать **«СОЗДАТЬ ПРОГРАММУ»**.
2. Календарь заполнился днями на 4–12 нед.
3. В Supabase: таблица `training_programs` — новая строка; `workout_plans` — строки с `program_id`, `week_index`, `day_index`.

### Шаг 5 — План дня и коррекции (3 мин)

1. Выбрать день в календаре → **«Сгенерировать план»** (Gemini).
2. В карточках упражнений: бейджи **«коррекция»** / **«замена»** и текст причины (если есть ограничения из скана/здоровья).

### Шаг 6 — Тренировка с весом (5 мин)

1. **START WORKOUT** на выбранном дне.
2. Экран показывает упражнения из плана (не hardcode «squat»).
3. Завершить 1–2 подхода, ввести **вес снаряда (кг)**.
4. В Supabase: `workout_set_logs` — строки с `weight_kg`, `workout_session_exercises`.

### Шаг 7 — Принять этап

Написать в чат: **«принимаю этап 6»**.

Тогда агент:

1. Заморозит Этап 6 в `10-frozen-stages.mdc`
2. Обновит паспорт → `ЗАВЕРШЁН — ЗАМОРОЖЕН`
3. Синхронизирует паспорт в Google Docs
4. По запросу — commit fallback-кода и/или merge в `main`

---

## Решения пользователя (зафиксировать)

1. Этап 6 **начат** 2026-07-27, реализован 6A–6C + 6E.
2. ИИ + **полный биоскан** + опросник → планирование.
3. Локация: **дом / зал / оба** — фильтр упражнений.
4. **Вес тела** — автоматически; **вес снаряда** — на каждый подход (6C).
5. Программа **4–12 нед.**, ИИ может предложить длительность.
6. Этапы 0–5 **приняты и заморожены** (5-й — 2026-07-26).

---

## Заморожено (не трогать без переоткрытия)

См. `.cursor/rules/10-frozen-stages.mdc`. Кратко: auth, scan, atlas, plan (кроме файлов в паспорте 7), workout, analytics.

**Переоткрыто в Этапе 6:** plan/workout-файлы из паспорта stage-07.

---

## Команда для нового чата (скопировать)

```
Проект Atlant-Hybrid. Читай docs/HANDOFF.md, docs/PROGRESS.md, docs/passports/stage-07-intelligent-training.md.

Активный этап: 6 — умный тренинг (ОЖИДАЕТ ПРИЁМКИ). Этапы 0–5 заморожены.

Сделано: 6A intake+bioScan, 6B engine-программа, 6C workout по плану + weight_kg, 6E corrective layer.
Commit 3282625 на ветке cursor/accept-stage-5-freeze-stage-2.

Осталось пользователю: применить миграцию 002 (health_concerns), пройти чеклист приёмки, сказать «принимаю этап 6».
6D (прогрессия, analytics) — не начат.

Не коммитить Avatar3D и эксперименты в layout/three.
```

---

## Ссылки

- Google Docs Этап 5: https://docs.google.com/open?id=1lelKEJiJep8yecBTxOUm0CtHxgxd-us-1CEz3mFIb4w
- AI routing: `docs/AI_ROUTING.md`
- Master TZ: `docs/MASTER_TZ.md`
