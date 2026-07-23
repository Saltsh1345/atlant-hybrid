# Паспорт Этапа 5 — `/analytics` аналитика и прогресс

## Статус

`ОЖИДАЕТ ПРИЁМКИ`

## Цель

Создать маршрут `/analytics` — post-workout отчёт: полноэкранный статичный 3D-атлас с post-workout подсветкой и выбором мышцы, Recharts (деградация скорости и прогресс за месяц), текстовое резюме Gemini, сохранение тоннажа/оценок в Supabase. Отправка калорий в Health API отложена (Huawei сейчас только read-only).

## Разрешённые пути

- `src/app/analytics/**` — новый маршрут.
- `src/components/analytics/**` — UI отчёта, графики, tooltip, резюме.
- `src/lib/analytics/**` — адаптер атласа, эвристики баланса, загрузка/сохранение отчёта, оценка нагрузки.
- `src/store/analyticsStore.ts` — состояние экрана аналитики.
- `src/app/api/analytics/**` — новый route handler резюме Gemini.
- `supabase/migrations/*stage_05*` — новая таблица/политики для отчётов аналитики.
- `docs/PROGRESS.md`
- `docs/passports/stage-06-analytics.md`
- `.cursor/rules/10-frozen-stages.mdc` — только после приёмки.

## Запрещённые изменения

- Все замороженные файлы Этапов 0–4 и 3D-подэтапа (`/`, `/scan`, `/plan`, `/workout`, `AtlasViewer`, Gemini-планировщик, `persistWorkoutSession` и т.д.).
- Маршруты `/`, `/scan`, `/plan`, `/workout` — без отдельного переоткрытия владельцем.
- Замена Gemini, Supabase, Recharts, MediaPipe; добавление зависимостей без согласования.
- Имитация записи калорий в Health как реально выполненной.
- Медицинские диагнозы по камере/VBT.

## Исходное состояние

- Этапы 0–4 и 3D-подэтап приняты и заморожены.
- `AtlasViewer` уже поддерживает `mode: "post_workout"` и статусы `worked` / `worked_well` / `overloaded` / `underworked`.
- `workout_sessions` хранит VBT/reps/`summary` (fatigue, failed); тоннаж и пиковые углы Stage 4 не пишет.
- Recharts установлен; есть legacy-графики — копируем паттерны, не правим.
- Huawei Health — только чтение метрик.

## Результат read-only аудита

- Post-workout палитра атласа уже в `atlasDefaults.ts`; новый builder мапит зоны без правок замороженного атласа.
- Recharts `^3.9.1` уже в проекте; новые графики в `src/components/analytics/**`.
- Gemini: переиспользуется `generateAnalysis` из `src/lib/ai/gemini.ts` через новый `POST /api/analytics/summary`.
- Калории в Health — отложить; локальная оценка ккал показывается явно как локальная.
- Навигация `/workout → /analytics` требует переоткрытия замороженного файла — не делалась.

## План внутри этапа

1. Read-only аудит Atlas/Recharts/sessions/Gemini/Health.
2. Миграция `analytics_reports` + RLS.
3. lib + store + API Gemini-резюме.
4. UI `/analytics`: атлас, tooltip, графики, резюме.
5. Проверки, паспорт → `ОЖИДАЕТ ПРИЁМКИ`, стоп.

## Изменённые файлы

Созданы (замороженные файлы не изменялись):

- `supabase/migrations/202607230001_stage_05_analytics_reports.sql` — таблица `analytics_reports` (тоннаж, ккал-оценка, peak_angles, zones, gemini_summary) + RLS select/insert/update.
- `src/lib/analytics/types.ts` — контракты экрана аналитики.
- `src/lib/analytics/estimateSessionLoad.ts` — оценка тоннажа/ккал и реконструкция VBT-серии из summary.
- `src/lib/analytics/analyzeSessionBalance.ts` — post-workout зоны + рекомендации tooltip.
- `src/lib/analytics/loadAnalyticsData.ts` — загрузка сессий/плана/отчёта, сохранение отчёта.
- `src/lib/analytics/generateAnalyticsSummary.ts` — обёртка Gemini + локальный fallback.
- `src/app/api/analytics/summary/route.ts` — POST с проверкой сессии Supabase (401 без входа).
- `src/store/analyticsStore.ts` — Zustand-состояние `/analytics`.
- `src/components/analytics/AnalyticsAtlasPanel.tsx` — `AtlasViewer` `mode: "post_workout"`, легенда, выбор мышцы.
- `src/components/analytics/AnalyticsZoneTooltip.tsx` — нагрузка + рекомендация.
- `src/components/analytics/AnalyticsCharts.tsx` — Recharts: деградация скорости и прогресс за месяц.
- `src/components/analytics/AnalyticsSummaryCard.tsx` — резюме Gemini + тоннаж/ккал.
- `src/components/analytics/AnalyticsDashboard.tsx` — оркестрация экрана.
- `src/app/analytics/page.tsx` — маршрут `/analytics`.
- `docs/PROGRESS.md` — статус этапа.
- `docs/passports/stage-06-analytics.md` — этот паспорт.

## Проверки

- `npx eslint` по файлам Этапа 5 — exit 0.
- `npx tsc --noEmit` — ошибок в файлах Этапа 5 нет; остаются известные ошибки в старом 3D (`Avatar3D/Model.tsx`, `AvatarViewerInner.tsx`).
- `GET /analytics` — HTTP 200.
- `POST /api/analytics/summary` без сессии — HTTP 401.

## Ограничения

- Пиковые углы и покадровая серия VBT Stage 4 не сохраняет: баланс/асимметрия — эвристика по fatigue/failed и целевым мышцам плана; график деградации строится из summary.
- Рабочий вес в сессиях не пишется: «прогресс весов» = оценка тоннажа (вес тела × reps) + avg_velocity за 30 дней.
- Запись калорий в Health API отложена.
- Переход с `/workout` на `/analytics` не добавлен (замороженный Stage 4); открывать `http://localhost:3000/analytics` напрямую или через ссылки на самом экране аналитики.

## Ручные действия владельца

1. В Supabase SQL Editor примените `supabase/migrations/202607230001_stage_05_analytics_reports.sql`. Без неё резюме покажется, но сохранение отчёта вернёт ошибку.
2. В Chrome/Edge войдите через Google, завершите тренировку на `/workout` (если ещё нет сессий), откройте `http://localhost:3000/analytics`.
3. Проверьте: вращение атласа 360°, клик по мышце → tooltip, графики, кнопку «СФОРМИРОВАТЬ РЕЗЮМЕ».

## Приёмка

- Решение пользователя: `ОЖИДАЕТСЯ`
- Git commit: `НЕ СОЗДАН`
- Заморозка: `НЕТ`
