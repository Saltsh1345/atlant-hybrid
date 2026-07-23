"use client";

import { toDateKey } from "@/store/planStore";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

export interface PlanCalendarProps {
  monthDate: Date;
  selectedDate: string;
  planDates: ReadonlySet<string>;
  sessionDates: ReadonlySet<string>;
  onSelectDate: (date: string) => void;
  onMonthChange: (next: Date) => void;
}

interface CalendarCell {
  key: string;
  day: number;
  inMonth: boolean;
}

function buildCells(monthDate: Date): CalendarCell[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  // Пн = 0 … Вс = 6
  const leadDays = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - leadDays);

  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    cells.push({
      key: toDateKey(date),
      day: date.getDate(),
      inMonth: date.getMonth() === month,
    });
  }
  return cells;
}

export default function PlanCalendar({
  monthDate,
  selectedDate,
  planDates,
  sessionDates,
  onSelectDate,
  onMonthChange,
}: PlanCalendarProps) {
  const cells = buildCells(monthDate);
  const todayKey = toDateKey(new Date());

  const shiftMonth = (delta: number) => {
    onMonthChange(
      new Date(monthDate.getFullYear(), monthDate.getMonth() + delta, 1),
    );
  };

  return (
    <div className="rounded-2xl border border-cyan-300/15 bg-[#060b13] p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="rounded-lg border border-cyan-300/20 px-3 py-1 text-sm text-cyan-200 transition hover:bg-cyan-300/10"
          aria-label="Предыдущий месяц"
        >
          ‹
        </button>
        <div className="text-sm font-semibold tracking-[0.12em] text-cyan-100">
          {MONTHS[monthDate.getMonth()]} {monthDate.getFullYear()}
        </div>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="rounded-lg border border-cyan-300/20 px-3 py-1 text-sm text-cyan-200 transition hover:bg-cyan-300/10"
          aria-label="Следующий месяц"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="py-1 text-[0.65rem] font-semibold tracking-widest text-cyan-300/60"
          >
            {day}
          </div>
        ))}
        {cells.map((cell) => {
          const isSelected = cell.key === selectedDate;
          const isToday = cell.key === todayKey;
          const hasPlan = planDates.has(cell.key);
          const hasSession = sessionDates.has(cell.key);

          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => onSelectDate(cell.key)}
              className={[
                "relative aspect-square rounded-lg text-xs transition",
                cell.inMonth ? "text-zinc-200" : "text-zinc-600",
                isSelected
                  ? "border border-cyan-300 bg-cyan-300/15 font-bold text-cyan-100"
                  : isToday
                    ? "border border-cyan-300/40"
                    : "border border-transparent hover:border-cyan-300/25",
              ].join(" ")}
            >
              {cell.day}
              {(hasPlan || hasSession) && (
                <span className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-0.5">
                  {hasSession && (
                    <span className="h-1 w-1 rounded-full bg-emerald-400" />
                  )}
                  {hasPlan && (
                    <span className="h-1 w-1 rounded-full bg-cyan-300" />
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex gap-4 text-[0.65rem] text-zinc-400">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          тренировка выполнена
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
          план
        </span>
      </div>
    </div>
  );
}
