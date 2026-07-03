"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Card from "@/components/ui/Card";
import type { SessionSummary } from "@/types";

export default function ProgressChart({
  history,
}: {
  history: SessionSummary[];
}) {
  const data = [...history]
    .reverse()
    .slice(-10)
    .map((s, i) => ({
      i: i + 1,
      form: s.formScore ?? 0,
      velocity: s.avgVelocity,
    }));

  if (data.length < 2) return null;

  return (
    <Card className="h-full md:p-5">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
        Прогресс (последние сессии)
      </p>
      <div className="h-28 w-full md:h-36 lg:h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis dataKey="i" hide />
            <YAxis
              yAxisId="form"
              domain={[0, 100]}
              tick={{ fontSize: 9, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
              width={28}
            />
            <YAxis
              yAxisId="vel"
              orientation="right"
              tick={{ fontSize: 9, fill: "#94a3b8" }}
              tickLine={false}
              axisLine={false}
              width={28}
            />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8 }}
              formatter={(v, name) => [
                name === "form" ? `${v}%` : `${v} м/с`,
                name === "form" ? "Техника" : "Скорость",
              ]}
              labelFormatter={(l) => `Сессия ${l}`}
            />
            <Line
              yAxisId="form"
              type="monotone"
              dataKey="form"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              yAxisId="vel"
              type="monotone"
              dataKey="velocity"
              stroke="#0ea5e9"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex gap-4 text-[10px] text-muted">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          Техника %
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-sky-500" />
          Ø скорость
        </span>
      </div>
    </Card>
  );
}
