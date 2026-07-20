# Паспорт Этапа 1 — загрузка и авторизация

## Статус

`ЗАВЕРШЁН — ЗАМОРОЖЕН`

## Цель

Реализовать маршрут `/` с загрузочным cyberpunk-экраном, появлением кнопки синхронизации через 2 секунды и Supabase Google OAuth. Huawei Health сохраняется в кодовой базе, но его авторизация перенесена на будущее по решению пользователя.

## Разрешённые пути

- `src/app/page.tsx`
- `src/app/auth/callback/route.ts`
- `src/components/onboarding/**`
- `src/lib/supabase/**`
- `src/store/userHealthStore.ts`
- `src/proxy.ts`
- `supabase/migrations/**`
- Существующие `src/app/api/health/**` и `src/lib/health/**` — только если интеграция невозможна без точечной совместимой правки.
- `.env.local.example` — только переменные Supabase и документирование существующей Huawei OAuth-интеграции.
- `package.json` и `package-lock.json` — только пакеты Supabase.
- `docs/PROGRESS.md`
- `docs/passports/stage-01-auth-loading.md`
- `.cursor/rules/10-frozen-stages.mdc` — только после приёмки.

## Запрещённые изменения

- Любые файлы замороженного Этапа 0, кроме служебного обновления `docs/PROGRESS.md`.
- Маршруты `/scan`, `/plan`, `/workout`, `/analytics`.
- Старый 3D-код и `public/avatar.glb`.
- MediaPipe, VBT, Gemini и логика анализа.
- Замена или удаление Huawei Health.
- Google Fit и Apple Health на этом шаге.
- Рефакторинг существующего приложения и удаление старых экранов.

## Исходное состояние

- `/` показывает существующий 3D-viewer.
- Huawei Health OAuth и API-роуты уже существуют.
- Supabase SDK не установлен.
- Отдельного health-профиля Zustand для веса, роста, возраста, пульса и процента жира нет.

## План внутри этапа

1. Изучить текущую главную страницу, health API, Zustand и документацию Next.js 16.
2. Создать загрузочный UI без изменения других экранов.
3. Добавить Supabase SSR/Auth и callback Google OAuth.
4. Добавить health-профиль Zustand и совместимую синхронизацию Huawei.
5. Проверить lint/build и OAuth-поток в браузере, насколько позволяют внешние настройки.
6. Записать ручные действия владельца.
7. Синхронизировать паспорт и передать этап на приёмку.

## Изменённые файлы

- `src/app/page.tsx` — подключён новый экран Этапа 1.
- `src/app/auth/callback/route.ts` — PKCE callback Supabase OAuth.
- `src/components/onboarding/LoadingAuthScreen.tsx` — загрузочный UI, последовательность Google → Huawei → синхронизация и кнопка перехода на `/scan` после подключения профиля.
- `src/lib/supabase/config.ts` — безопасное чтение публичной конфигурации.
- `src/lib/supabase/browser.ts` — браузерный Supabase client.
- `src/lib/supabase/server.ts` — серверный Supabase client с cookies Next.js 16.
- `src/lib/supabase/proxy.ts` — обновление auth-сессии.
- `src/proxy.ts` — Next.js 16 Proxy.
- `src/store/userHealthStore.ts` — глобальный Zustand health-профиль.
- `supabase/migrations/202607190001_stage_01_profiles.sql` — profiles и RLS.
- `.env.local.example` — Supabase и существующие Huawei OAuth-переменные.
- `package.json`, `package-lock.json` — добавлены `@supabase/ssr` и `@supabase/supabase-js`.
- `docs/PROGRESS.md` и этот паспорт — состояние этапа.

## Проверки

- Целевой ESLint изменённых исходников: успешно, 0 ошибок и предупреждений.
- `npx tsc --noEmit`: новые файлы Этапа 1 проходят; общая проверка блокируется 4 существующими ошибками в `Avatar3D/Model.tsx` и `three/AvatarViewerInner.tsx`. Эти файлы запрещено менять в Этапе 1.
- Браузер: `/` загружается, показывает 5 строк терминала и кнопку через 2 секунды.
- Браузер: при отсутствии Supabase UI показывает понятную ошибку и не падает.
- `NEXT_PUBLIC_SUPABASE_URL` и `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` найдены в `.env.local`.
- Supabase REST `profiles`: HTTP 200 — миграция таблицы доступна.
- Google Provider включён. OAuth успешно перенаправляет через Supabase на официальный экран входа Google.
- Полный Google OAuth завершён в обычном браузере: `/auth/callback?...` вернул `307`, затем `/?authConnected=1` вернул `200`.
- Пользователь подтвердил отображение статуса «GOOGLE-ПРОФИЛЬ ПОДКЛЮЧЁН».
- Huawei-переменные отсутствуют; это допустимо, потому что Huawei OAuth отложен решением пользователя.
- Google callback и сохранение профиля проверены.
- По прямому разрешению владельца от 2026-07-20 этап кратко открыт для склейки с Этапом 2: статус подключённого Google-профиля показывает кнопку «НАЧАТЬ БИО-СКАНИРОВАНИЕ», ведущую на `/scan`.
- ESLint изменённого onboarding-экрана и файлов Этапа 2 проходит без ошибок; `GET /scan` возвращает HTTP 200.
- `npm install`: 2 существующих/транзитивных moderate vulnerability; `npm audit fix --force` не запускался.

## Ручные действия владельца

### Supabase

1. Создать проект в Supabase.
2. В SQL Editor выполнить `supabase/migrations/202607190001_stage_01_profiles.sql`.
3. В Authentication → Providers включить Google и добавить Google OAuth Client ID/Secret.
4. В Google Cloud OAuth добавить redirect URI:
   `https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`.
5. В Supabase Authentication → URL Configuration:
   - Site URL: `http://localhost:3000`
   - Redirect URL: `http://localhost:3000/auth/callback`
6. В `.env.local` добавить:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

### Huawei Health

Настройка не требуется в Этапе 1. Пользователь решил 2026-07-19 оставить Huawei OAuth на будущее. После Google OAuth приложение сохраняет Supabase-профиль и не запускает Huawei автоматически.

### Ограничение данных

До подключения Health-провайдера вес, рост, возраст, пульс покоя и процент жира остаются `null`. Поля созданы в Zustand и Supabase. Запрещено подставлять вымышленные значения.

Ручная настройка и проверка Google OAuth выполнены. Huawei не блокирует приёмку Этапа 1.

## Google Docs

- Документ: https://docs.google.com/open?id=1HNAr4u7uwu-ENedtqUQJtQsvecr57IBNkF6ADQzwkkw

## Приёмка

- Решение пользователя: `ПРИНЯТ 2026-07-19`
- Git commit: `НЕ СОЗДАН`
- Заморозка: `ДА`
