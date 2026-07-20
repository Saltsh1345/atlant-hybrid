# Паспорт Этапа 0 — правила и защита проекта

## Статус

`ЗАВЕРШЁН — ЗАМОРОЖЕН`

## Цель

Создать постоянную систему управления проектом, которая запрещает самовольные изменения, защищает принятые этапы и сохраняет историю решений.

## Разрешено

- Документация процесса.
- Правила Cursor.
- Локальные паспорта этапов.
- Механизм синхронизации паспортов с Google Docs.
- Документ выбора AI-инструментов.

## Запрещено

- Любые изменения `src/**`.
- Любые изменения 3D-ассетов и `public/**`.
- Начало Этапа 1.
- Изменение работающих сервисов и зависимостей приложения.
- Git commit без отдельной команды пользователя.

## Исходное состояние

- Проект уже содержит Next.js 16, React 19, Tailwind 4, Zustand, R3F, MediaPipe, Recharts, Gemini и Huawei Health.
- Имеется работающий код, который нельзя удалять или переписывать без команды.
- Постоянных `.cursor/rules` до Этапа 0 не было.
- Автоматической синхронизации паспортов с Google Docs не было.

## Выполненные изменения

- Создан неизменяемый MASTER ТЗ.
- Создан журнал прогресса.
- Создан каталог паспортов.
- Созданы постоянные правила Cursor.
- Зафиксирована маршрутизация AI-инструментов по этапам.
- Подготовлен Google Apps Script и локальная команда синхронизации паспортов.

## Файлы этапа

- `docs/MASTER_TZ.md`
- `docs/PROGRESS.md`
- `docs/AI_ROUTING.md`
- `docs/passports/README.md`
- `docs/passports/stage-00-governance.md`
- `docs/google-docs/SETUP.md`
- `docs/google-docs/Code.gs`
- `.cursor/rules/00-master-process.mdc`
- `.cursor/rules/10-frozen-stages.mdc`
- `.cursor/rules/20-approved-stack.mdc`
- `.cursor/rules/30-stage-passports.mdc`
- `.cursor/rules/40-ai-routing.mdc`
- `tools/google-docs/sync-passport.mjs`
- `.env.local.example`
- `package.json`

## Проверки

- Найдены все 5 обязательных `.cursor/rules`.
- Найдены MASTER ТЗ, журнал, паспорт, AI-маршрутизация и инструкция Google Docs.
- IDE не обнаружила ошибок линтера в скрипте и `package.json`.
- `npm.cmd run passport:sync -- docs/passports/stage-00-governance.md` — успешно, получен URL Google Doc.

## Ручные действия владельца

- Создать отдельную папку Google Drive для паспортов. — выполнено
- Развернуть предоставленный Google Apps Script. — выполнено
- Добавить URL и секрет синхронизации в локальный `.env.local`. — выполнено
- Выполнить тестовую синхронизацию. — выполнено

## Google Docs

- Папка: настроена владельцем (`ATLANT_PASSPORT_FOLDER_ID` в Script Properties)
- Документ: https://docs.google.com/open?id=14ALgeueOHUhk54P0ZCWG79vnJTHFQYhWrBMuwNJ4rdA

## Блокировка

Снята после успешной тестовой синхронизации паспорта.

## Приёмка

- Решение пользователя: `ПРИНЯТ 2026-07-19`
- Git commit: `НЕ СОЗДАН`
- Заморозка: `ДА`
