# Паспорт Этапа 6 — умный тренинг (опросник, программа, история подходов)

## Статус

`ОЖИДАЕТ ПРИЁМКИ`

## Цель

Создать систему осмысленного планирования и ведения тренировок:
- опросник целей/опыта/локации (дом/зал) + решения совместно с данными биоскана;
- программы на 4–12 недель (клиент выбирает или доверяет рекомендацию ИИ);
- полная история: упражнения × подходы × **рабочий вес** (штанга/гантели);
- live-ведение `/workout` по плану (6C); прогрессия — подэтап 6D.

## Разрешённые пути

- `src/lib/training/intake/**` — опросник, сохранение, рекомендация длительности программы.
- `src/lib/training/science/**` — структурированные правила силовой подготовки (не замена Gemini).
- `src/lib/training/corrective/**` — коррекционный слой (ограничения, замены, prehab)
- `src/components/training/**` — UI опросника.
- `src/store/trainingIntakeStore.ts`
- `supabase/migrations/*stage_06*` — intake, programs, set logs.
- Точечное переоткрытие Этапа 3: `src/lib/plan/types.ts`, `planContext.ts`, `planContextServer.ts`, `persistPlan.ts`, `generatePlanWithGemini.ts`, `PlanDashboard.tsx`, `StartWorkoutButton.tsx`.
- API: `src/app/api/training/program/generate/route.ts`
- **Подэтап 6C — точечное переоткрытие Этапа 4:**
  - `src/app/workout/page.tsx`
  - `src/components/workout/WorkoutLiveScreen.tsx`, `WorkoutHUD.tsx`, `WorkoutAtlasPanel.tsx`
  - `src/lib/workout/types.ts`, `persistWorkoutSession.ts`, `loadWorkoutProfile.ts`
  - `src/store/workoutStore.ts`
- **Новые пути 6C:** `src/lib/workout/loadWorkoutPlan.ts`, `persistSetLog.ts`, `src/components/workout/WorkoutSetPanel.tsx`
- `docs/PROGRESS.md`, `docs/HANDOFF.md`, этот паспорт.

## Запрещённые изменения

- Замороженные файлы без записи в этом паспорте (auth, scan flow, analytics core, AtlasViewer).
- Замена Gemini, Supabase, Huawei Health.
- Avatar3D / layout / three experiments — не коммитить.
- Медицинские диагнозы.

## Решения пользователя 2026-07-27

1. **Начинаем Этап 6.**
2. **Опросник** — цель, опыт, дни/неделю; ИИ + биоскан.
3. **Локация** — дом или спортзал (фильтр упражнений/оборудования).
4. **Вес:**
   - **Тела** — из Health/профиля/скана (не вводить каждую тренировку).
   - **Снаряда** — штанга/гантели/тренажёр **на каждый подход** на `/workout` (6C).
5. **Длина программы** 4–12 недель: пользователь выбирает или «пусть ИИ предложит».
6. **Биоверификация:** полный скан в контексте планирования.

## Подэтапы

| Подэтап | Статус | Содержание |
|---------|--------|------------|
| 6A | реализован | опросник, миграция, bioScan, daily Gemini |
| 6B | реализован | engine программы 4–12 нед., `training_programs`, materialize `workout_plans` |
| 6C | реализован | `/workout` по плану, `weight_kg` на подход, `workout_set_logs` |
| 6E | реализован | коррекционный слой: скан + health_concerns + замены + prehab |
| 6D | очередь | прогрессия, analytics tonnage |

## Изменённые файлы

### 6A (ранее)

- `supabase/migrations/202607270001_stage_06_training_intelligence.sql`
- `src/lib/training/intake/**`, `bioScan/buildBioScanProfile.ts`, `science/rules.ts`
- `src/lib/training/program/buildPlanningContext.ts`
- `src/components/training/TrainingIntakeWizard.tsx`, `src/store/trainingIntakeStore.ts`
- `src/lib/plan/types.ts`, `planContext.ts`, `generatePlanWithGemini.ts`, `PlanDashboard.tsx`

### 6B (новые)

- `src/lib/training/program/types.ts`, `splitTemplates.ts`, `exerciseGuards.ts`, `generateProgram.ts`, `persistProgram.ts`
- `src/lib/training/intake/loadTrainingIntakeServer.ts`
- `src/lib/plan/planContextServer.ts`
- `src/app/api/training/program/generate/route.ts`
- `src/lib/plan/persistPlan.ts` — `program_id`, `week_index`, `day_index`, `loadPlanByDate`
- `src/components/plan/PlanDashboard.tsx` — кнопка «Создать программу», индикатор active program

### 6C (новые)

- `src/lib/workout/loadWorkoutPlan.ts`, `persistSetLog.ts`
- `src/components/workout/WorkoutSetPanel.tsx`
- `src/lib/workout/types.ts`, `src/store/workoutStore.ts` — plan-driven set state
- `src/components/workout/WorkoutLiveScreen.tsx`, `WorkoutHUD.tsx`
- `src/app/workout/page.tsx` — `?date=YYYY-MM-DD`
- `src/components/plan/StartWorkoutButton.tsx` — передача даты

## Проверки

| Команда | Результат |
|---------|-----------|
| `npx eslint` по файлам 6A–6C | exit 0 (warnings only в WorkoutLiveScreen — React 19 refs/set-state) |
| REST `user_training_intake` | **404 — миграция stage_06 НЕ применена** (2026-07-27) |
| `npx tsc --noEmit` | ошибки только в Avatar3D (не часть этапа) |

### 6E — коррекционный слой (новые)

- `src/lib/training/corrective/types.ts`, `buildConstraintProfile.ts`, `exerciseMeta.ts`, `applyCorrectiveLayer.ts`
- `supabase/migrations/202607270002_stage_06_health_concerns.sql`
- `TrainingIntakeWizard` — шаг «Здоровье»; `healthConcerns` в intake
- `generatePlanWithGemini.ts`, `exerciseGuards.ts` — единый слой вместо только гиперлордоза
- `TodayExerciseCards`, `PlanDashboard` — бейджи и причины коррекции

## Ручные действия владельца

1. **Обязательно:** миграции `202607270001` и **`202607270002_stage_06_health_concerns.sql`** в Supabase SQL Editor.
2. `/plan` → опросник → «Создать программу на N нед.» → проверить календарь и строки в `training_programs` / `workout_plans`.
3. `/plan` → START WORKOUT на день с планом → ввести вес снаряда → завершить подходы → проверить `workout_set_logs` в Supabase.
4. Генерация одного дня (Gemini) по-прежнему доступна для ad-hoc дней.

## Ограничения

- Генератор программы — **engine** (не batch Gemini); daily plan — Gemini/fallback как в Этапе 3.
- Analytics tonnage из `workout_set_logs` — подэтап 6D.
- Без миграции stage_06 intake/program/set_logs не сохраняются.

## Приёмка

- Решение пользователя: `ОЖИДАЕТСЯ`
- Git commit: —
- Заморозка: `НЕТ`
