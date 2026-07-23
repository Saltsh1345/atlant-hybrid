# Паспорт Этапа 3 — `/plan` дашборд и ИИ-планировщик

## Статус

`ЗАВЕРШЁН — ЗАМОРОЖЕН`

## Цель

Создать маршрут `/plan` — ежедневный центр управления: интерактивный календарь с историей и планом, статичный 3D-атлас с подсветкой невосстановленных и целевых мышц, карточки упражнений на сегодня и кнопка `[ START WORKOUT ]`. Gemini генерирует план с учётом профиля, нарушений осанки, прошлых тренировок и восстановления. Supabase хранит историю тренировок.

## Разрешённые пути

- `src/app/plan/**` — новый маршрут.
- `src/components/plan/**` — новые компоненты дашборда.
- `src/lib/plan/**` — новая логика плана и адаптеры данных.
- `src/store/planStore.ts` — новое состояние этапа.
- `src/app/api/**` — только новый route handler планировщика, без изменения существующих.
- `supabase/migrations/**` — только новая миграция Этапа 3.
- Замороженный `AtlasViewer` — только импорт через props.
- Существующие Gemini-модули (`src/lib/ai/**`) — только переиспользование; точечная правка лишь после записи причины в паспорт.
- `docs/PROGRESS.md`
- `docs/passports/stage-04-plan.md`
- `.cursor/rules/10-frozen-stages.mdc` — только после приёмки.

## Запрещённые изменения

- Все замороженные файлы Этапов 0, 1, 2 и 3D-подэтапа.
- Маршруты `/`, `/scan`, `/workout`, `/analytics`.
- Замена Gemini или добавление другого AI-провайдера.
- MediaPipe, VBT, формулы скана и старый 3D-код.
- Новые зависимости без отдельного согласования.

## Исходное состояние

- Этапы 0–2 и 3D-подэтап приняты и заморожены.
- `AtlasViewer` готов и принимает `AtlasVisualizationInput` через props.
- В Supabase есть `profiles` и `body_scans`; таблицы истории тренировок нет.
- Gemini уже интегрирован в проект (body-scan анализ); планировщика нет.
- Маршрута `/plan` нет.

## Результат read-only аудита

- Gemini-клиент создаётся по паттерну `src/lib/ai/gemini.ts`: `GEMINI_API_KEY`, перебор `GEMINI_MODELS`, локальный fallback. Для плана создаётся новый `src/lib/plan/generatePlanWithGemini.ts` и новый route `src/app/api/plan/generate/route.ts`; существующие Gemini-файлы не изменяются.
- Локальный `generateWorkoutPlan` из `src/lib/ai/workoutPlan.ts` используется как offline-fallback планировщика.
- Готового календаря в проекте нет; референсы карточек — `TrainingProgramPanel` и `AiPlanCard`. Для `/plan` создаются новые компоненты.
- `computeMuscleReadiness` даёт группы «Ноги/Спина/Грудь/Плечи/Кор»; для подсветки атласа нужен адаптер групп к `ATLAS_MUSCLE_GROUPS`.
- История тренировок сейчас только в Zustand; по ТЗ создаются таблицы Supabase `workout_sessions` и `workout_plans` с RLS по паттерну Этапов 1–2.
- Контекст Gemini читается из `profiles` (`hyperlordosis_likely`, `scan_anthropometrics`, health-поля) и последнего `body_scans.result`.
- `AtlasViewer` замороженный: подсветка через `mode: "plan"`, статусы `not_recovered` и `target` (синий пульс задаётся пресетом).

## План внутри этапа

1. Провести read-only аудит существующих Gemini-модулей, dashboard-компонентов и данных, доступных для контекста плана.
2. Создать миграцию Supabase для истории тренировок и плана.
3. Создать `/plan`: календарь, карточки упражнений, кнопка `[ START WORKOUT ]`.
4. Подключить статичный 3D-атлас с подсветкой невосстановленных (тускло-красный) и целевых (пульс синий) мышц.
5. Реализовать серверный вызов Gemini для генерации плана с контекстом: профиль, `hyperlordosis_likely`, прошлые тренировки, восстановление.
6. Сохранить план и историю в Supabase с RLS.
7. Проверить lint, типы и браузер.
8. Синхронизировать паспорт и остановиться на приёмке.

## Изменённые файлы

Созданы (существующие файлы не изменялись):

- `supabase/migrations/202607200003_stage_03_workout_plans.sql` — таблицы `workout_sessions` (история тренировок) и `workout_plans` (план дня, upsert по `user_id + plan_date`) с RLS по паттерну Этапов 1–2.
- `src/lib/plan/types.ts` — контракты этапа: `DailyPlan`, `PlanExercise`, `PlanSessionRow`, `PlanGenerationContext`.
- `src/lib/plan/readinessToAtlas.ts` — восстановление групп по истории Supabase (`computePlanRecovery`, без latchedBody), порог 55 %, адаптер `buildPlanAtlasZones` → зоны `not_recovered`/`target` для замороженного `AtlasViewer`.
- `src/lib/plan/planContext.ts` — чтение контекста: профиль (рост, вес, возраст, жир, `hyperlordosis_likely`, `scan_anthropometrics`), осанка из последнего `body_scans.result`, последние 10 тренировок.
- `src/lib/plan/generatePlanWithGemini.ts` — серверная генерация плана: перебор `GEMINI_MODELS`, ответ строго JSON, валидация `exerciseId` по каталогу, защита от гиперлордоза (замена осевых упражнений: squat→leg_press, deadlift→hip_thrust и т.д.), fallback на локальный `generateWorkoutPlan`.
- `src/lib/plan/persistPlan.ts` — сохранение плана (upsert) и чтение планов/сессий за диапазон дат.
- `src/app/api/plan/generate/route.ts` — новый route handler POST с проверкой сессии Supabase (401 без входа), `maxDuration 60`.
- `src/store/planStore.ts` — Zustand-состояние этапа: выбранная дата, планы по датам, сессии, контекст, статусы загрузки/генерации.
- `src/components/plan/PlanCalendar.tsx` — интерактивный месячный календарь (Пн–Вс, навигация по месяцам, метки: зелёная — выполненная тренировка, голубая — план).
- `src/components/plan/TodayExerciseCards.tsx` — карточки упражнений дня (подходы×повторы, отдых, инвентарь, подсказка), советы плана, кнопка генерации/обновления.
- `src/components/plan/PlanAtlasPanel.tsx` — замороженный `AtlasViewer` в `mode: "plan"` + легенда + проценты восстановления пяти групп.
- `src/components/plan/StartWorkoutButton.tsx` — точечное переоткрытие 2026-07-23: заглушка заменена на активную ссылку `[ START WORKOUT ]` → `/workout` при наличии плана дня; без плана кнопка остаётся неактивной. Других изменений в файлах Этапа 3 нет.
- `src/components/plan/PlanDashboard.tsx` — оркестрация: загрузка контекста, экран «Нужен вход» без сессии, обновление данных при смене месяца, генерация и сохранение плана.
- `src/app/plan/page.tsx` — страница маршрута `/plan`.

Замороженные файлы не изменялись. Существующие Gemini-модули использованы только импортом (`GEMINI_MODELS`, `isModelNotFoundError`, `generateWorkoutPlan`).

## Проверки

- `npm run lint` — exit 0, новых предупреждений по файлам этапа нет.
- `npx tsc --noEmit` — ошибок в файлах Этапа 3 нет; остаются 4 ранее известные ошибки в старом 3D-коде (`src/components/Avatar3D/Model.tsx`, `src/components/three/AvatarViewerInner.tsx`) — заморожены, вне зоны этапа.
- `npx eslint src/components/plan/StartWorkoutButton.tsx` — exit 0 после точечного переоткрытия 2026-07-23 (переход `/plan → /workout`).
- `GET /plan` — HTTP 200 на dev-сервере.
- Браузер: без сессии `/plan` показывает экран «Нужен вход» с кнопкой «НА ГЛАВНУЮ» — подтверждено скриншотом-снапшотом.
- `POST /api/plan/generate` без сессии — HTTP 401 (авторизация обязательна).

## Ограничения

- План Gemini — рекомендация, не медицинское назначение.
- Кнопка `[ START WORKOUT ]` ведёт на готовый маршрут `/workout` (Этап 4) при наличии плана на выбранный день; без плана — неактивна.

## Ручные действия владельца

1. В Supabase Dashboard откройте **SQL Editor** и примените `supabase/migrations/202607200003_stage_03_workout_plans.sql`. Без неё сохранение планов вернёт ошибку, а календарь не покажет историю.
2. Убедитесь, что в `.env.local` задан `GEMINI_API_KEY`. Без ключа планировщик работает на локальном fallback (это штатный режим, план всё равно создаётся).
3. В обычном Chrome/Edge войдите через Google на `http://localhost:3000`, откройте `http://localhost:3000/plan`, нажмите «СГЕНЕРИРОВАТЬ ПЛАН» и проверьте: карточки упражнений, подсветку атласа (синий пульс — цель дня, тускло-красный — невосстановлено) и появление голубой метки в календаре.

## Приёмка

- Решение пользователя: `ПРИНЯТ 2026-07-20`
- Git commit: `24f30af` (Этап 3), `f486ed9` (точечный переход `/plan → /workout`)
- Заморозка: `ДА`
- Google Docs: https://docs.google.com/open?id=1gJHbpagDo_ePsf5rrAcz7hAQQ6GCRt8KvIFY_hI_9ic
