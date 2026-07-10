"use client";

import Card from "@/components/ui/Card";

const STEPS = [
  {
    n: 1,
    title: "Ключ Gemini (обязательно)",
    body: "Откройте папку проекта atlant-hybrid. Скопируйте .env.local.example в .env.local. Вставьте GEMINI_API_KEY с https://aistudio.google.com/apikey. Перезапустите npm run dev.",
    done: "Видеоанализ и голосовой разбор после тренировки.",
  },
  {
    n: 2,
    title: "Калибровка тела (один раз)",
    body: "В приложении: Профиль → Калибровка → встаньте в полный рост перед камерой. Это нужно для точного 3D-двойника и углов суставов.",
    done: "Двойник и биомеханика совпадают с вашим телом.",
  },
  {
    n: 3,
    title: "Настройка позиции (новое)",
    body: "Перед тренировкой AI-тренер покажет, как встать. Камера НЕ ездит за вами — вы двигаетесь по подсказкам. Когда полоска зелёная — «Готов». На телефоне можно переключить переднюю/заднюю камеру.",
    done: "Бокс и теннис — лицом к камере. Силовые — колени и спина в кадре.",
  },
  {
    n: 4,
    title: "Первая drill-сессия",
    body: "Дашборд → Бокс или Теннис → Тренировка. Дождитесь «Камера готова», отсчёт 3-2-1, затем бейте по команде в камеру. Смотрите строку «эталон %» после удара.",
    done: "Olympic Track сравнивает вас с профи, не с прошлыми ошибками.",
  },
  {
    n: 5,
    title: "Анализ",
    body: "После серии анализ откроется сам через 3 секунды. Блок Olympic Track покажет % к элите, отклонения и видеоразбор Gemini.",
    done: null,
  },
  {
    n: 6,
    title: "YOLO (опционально, бесплатно)",
    body: "Для детекции ударов на видео: Colab + Ultralytics YOLO (см. tools/elite/README.md). Укажите YOLO_PROVIDER=custom и YOLO_API_URL в .env.local. Roboflow не обязателен.",
    done: "Точнее распознавание jab/cross/hook на клипах.",
  },
];

export default function OlympicTrackSteps() {
  return (
    <Card className="mb-4 border-dashed">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
        Пошаговая настройка Olympic Track
      </p>
      <ol className="space-y-4">
        {STEPS.map((s) => (
          <li key={s.n} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/15 text-sm font-bold text-[var(--primary)]">
              {s.n}
            </span>
            <div>
              <p className="font-semibold text-foreground">{s.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-foreground-secondary">
                {s.body}
              </p>
              {s.done && (
                <p className="mt-1 text-xs text-success">✓ {s.done}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-[11px] text-muted">
        Пароли и API-ключи в чат не отправляйте — только в .env.local на вашем ПК.
        Полная инструкция: docs/OLYMPIC_TRACK_SETUP.md
      </p>
    </Card>
  );
}
