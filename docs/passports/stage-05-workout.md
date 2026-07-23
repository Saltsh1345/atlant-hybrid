# Паспорт Этапа 4 — `/workout` Live Scanner

## Статус

`ЗАВЕРШЁН — ЗАМОРОЖЕН`

## Цель

Создать маршрут `/workout` — производительный live-режим тренировки без касаний: камера как фон, cyan-скелет MediaPipe и углы суставов поверх видео, HUD с таймером/VBT/весом, жесты «палец вверх» (старт) и открытая ладонь (пауза), а также статичный Mini-Atlas мышц.

## Разрешённые пути

- `src/app/workout/**` — новый маршрут.
- `src/components/workout/**` — новый live-интерфейс, HUD, распознавание жестов и адаптер атласа.
- `src/lib/workout/**` — новые VBT- и gesture-утилиты Этапа 4.
- `src/store/workoutStore.ts` — новое состояние текущей тренировки.
- `src/app/api/**` — только новый route handler Этапа 4 при доказанной необходимости.
- `docs/PROGRESS.md`
- `docs/passports/stage-05-workout.md`
- `.cursor/rules/10-frozen-stages.mdc` — только после приёмки.

## Запрещённые изменения

- Все замороженные файлы Этапов 0–3 и 3D-подэтапа, включая `/scan`, `/plan`, `AtlasViewer`, Supabase-клиенты и Gemini-планировщик.
- Маршруты `/`, `/scan`, `/plan`, `/analytics`.
- Замена Gemini, Supabase, MediaPipe или добавление зависимостей без отдельного согласования.
- Представление FMG/EMG как реальных данных: интеграция Web Bluetooth отложена, пока нет физического устройства.
- Медицинские диагнозы на основании камеры или VBT.

## Исходное состояние

- Этапы 0–3 и технический 3D-подэтап приняты и заморожены.
- В проекте уже есть камера, MediaPipe Pose, overlay скелета и существующие VBT/gesture-модули; они сначала исследуются read-only.
- Статичный `AtlasViewer` уже готов, доступен только импортом через props.
- Маршрут `/workout` отсутствует.

## Результат read-only аудита

- Переиспользуются только импортом: `useCameraDevice`, `usePoseTracker`, `PoseOverlay`, `CameraStatusOverlay`, `AtlasViewer`, типы атласа, каталог упражнений и контракт `DailyPlan`.
- Камера/Pose работают через `requestAnimationFrame`; landmarks нельзя класть в React state каждый кадр. В новом экране используются refs и throttled UI-обновления.
- Старый `computeKinematics` не соответствует ТЗ Этапа 4: для силового режима берёт скорость колена и не сравнивает с первым повтором. Создаётся изолированный `vbtFatigue.ts`: вертикальная скорость запястья, baseline первого повторения и отказ при падении скорости ≥20%.
- В проекте отсутствует распознавание `thumbs_up`/`open_palm`; создаются новые модули Hand Landmarker и state machine с удержанием/задержкой повторного срабатывания. Используется уже установленный `@mediapipe/tasks-vision`; новых зависимостей не требуется.
- Существующий `PoseOverlay` не подходит для требования cyan-скелета с углами суставов: создаётся `WorkoutPoseOverlay.tsx`.
- `AtlasViewer` поддерживает `mode: "live"` и `variant: "mini"`; статусы строго мапятся: `target` — зелёный, `fatigue` — жёлтый, `failure` — пульсирующий красный.
- `workout_sessions` уже имеет RLS insert/select, но client helper для записи отсутствует; он создаётся в разрешённом `src/lib/workout/**`.
- Вес читается из `profiles` только через новый read-only helper; данные FMG/EMG и Web Bluetooth не добавляются.

## План внутри этапа

1. Провести read-only аудит существующих camera/Pose, VBT, gesture и session-модулей; определить, что можно переиспользовать без правок.
2. Зафиксировать контракт live-сессии: состояния, жесты, границы VBT и статусы нагрузки Mini-Atlas.
3. Создать `/workout`, `WorkoutLiveScreen`, HUD и Mini-Atlas через замороженный `AtlasViewer`.
4. Подключить камеру, pose overlay, расчёт углов и VBT по вертикальной скорости запястья.
5. Реализовать распознавание «палец вверх» для запуска и открытой ладони для паузы с debounce/устойчивостью позы.
6. Подсвечивать мышцы: зелёный — работа, жёлтый — утомление, пульсирующий красный — падение скорости ≥20 % от первого повтора.
7. Проверить lint, типы, мобильную раскладку и работу камеры/жестов в браузере.
8. Синхронизировать паспорт и остановиться на приёмке.

## Изменённые файлы

- `src/app/workout/page.tsx` — новый маршрут Live Scanner.
- `src/components/workout/WorkoutLiveScreen.tsx` — camera/Pose pipeline с rAF, жесты, VBT и Mini-Atlas.
- `src/components/workout/WorkoutPoseOverlay.tsx` — cyan-скелет и углы локтей/коленей поверх видеопотока.
- `src/components/workout/WorkoutHUD.tsx` — HUD таймера, VBT, веса, повторов и утомления.
- `src/components/workout/WorkoutAtlasPanel.tsx` — замороженный `AtlasViewer` в режиме `live`, варианте `mini`, без взаимодействия.
- `src/lib/workout/types.ts` — типы состояния, жестов, VBT и углов.
- `src/lib/workout/vbtFatigue.ts` — вертикальная скорость запястья, baseline первого повтора и флаг отказа при падении скорости ≥20%.
- `src/lib/workout/gestureDetector.ts` — Hand Landmarker из уже установленного MediaPipe Tasks Vision и классификация двух жестов.
- `src/lib/workout/gestureStateMachine.ts` — 10 кадров удержания и 1,6 с cooldown между действиями.
- `src/lib/workout/loadWorkoutProfile.ts` — read-only чтение роста/веса/возраста из Supabase-профиля.
- `src/lib/workout/persistWorkoutSession.ts` — безопасная клиентская запись завершённой сессии в уже существующую RLS-таблицу `workout_sessions`.
- `src/lib/workout/buildWorkoutAtlasZones.ts` — маппинг целевых мышц в `target`/`fatigue`/`failure` зоны атласа с приоритетом отказа.
- `src/store/workoutStore.ts` — изолированное Zustand-состояние live-сессии.

Исправление 2026-07-20: `loadWorkoutProfile()` обрабатывает сетевой сбой Supabase/Auth и возвращает `null`; Live Scanner продолжает работу с «—» вместо веса.

Решение владельца 2026-07-20: сессия завершается двумя равноправными способами — кнопкой «ЗАВЕРШИТЬ И СОХРАНИТЬ» или удержанием открытой ладони 1,8 с. Короткая открытая ладонь сохраняет назначение из ТЗ: пауза.

## Проверки

- Прочтена документация Next.js о Server/Client Components: browser APIs и камера остаются внутри `WorkoutLiveScreen` с `"use client"`; страница `/workout` — server component.
- `npx.cmd eslint "src/app/workout/**/*.tsx" "src/components/workout/**/*.tsx" "src/lib/workout/**/*.ts" "src/store/workoutStore.ts"` — пройдено без предупреждений после исправления cleanup refs.
- `GET http://localhost:3000/workout` — HTTP 200.
- После исправления fail-safe профиля: ESLint `loadWorkoutProfile.ts` и `WorkoutLiveScreen.tsx` — пройдено; `GET /workout` — HTTP 200.
- После добавления завершения/сохранения: ESLint изменённых модулей — пройдено; TypeScript не показывает ошибок Этапа 4 (остаются 4 ранее известные ошибки замороженного старого 3D-кода).
- Финальный ESLint всех файлов Этапа 4 — пройдено без ошибок и предупреждений.
- Browser snapshot `http://localhost:3000/workout` — отрисованы HUD, Mini-Atlas и состояние подключения камеры.
- `npx.cmd tsc --noEmit` — ошибок Этапа 4 нет; команда остаётся красной из-за 4 существующих ошибок в не относящихся к Этапу 4 файлах `src/components/Avatar3D/Model.tsx` и `src/components/three/AvatarViewerInner.tsx`.

## Ограничения

- Камера и жесты требуют ручного разрешения пользователя в браузере.
- VBT по 2D-камере является оценкой движения, а не измерением сертифицированного датчика.
- Данные FMG/EMG не имитируются; Web Bluetooth появится отдельным разрешённым подэтапом с физическим устройством.

## Ручные действия владельца

1. В обычном Chrome/Edge откройте `http://localhost:3000/workout` и разрешите камеру. Встроенный браузер Cursor оставляет камеру в состоянии подключения, поэтому не подходит для приёмки жестов.
2. Покажите большой палец вверх неподвижно примерно 0,2 с — таймер должен стартовать или возобновиться. Покажите открытую ладонь — тренировка должна стать на паузу.
3. Выполните несколько повторов с отчётливым вертикальным движением запястья. Первый завершённый повтор задаёт baseline; при снижении пика скорости не менее чем на 20% Mini-Atlas должен стать пульсирующим красным.
4. Завершите сессию кнопкой или удержанием открытой ладони 1,8 с. При доступном Supabase должно появиться «Тренировка сохранена», а в `workout_sessions` — новая строка.

## Приёмка

- Решение пользователя: `ПРИНЯТ 2026-07-20`
- Git commit: `НЕ СОЗДАН`
- Заморозка: `ДА`
