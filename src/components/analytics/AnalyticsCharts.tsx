"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  MonthlyProgressPoint,
  VelocityPoint,
} from "@/lib/analytics/types";

export interface AnalyticsChartsProps {
  velocitySeries: VelocityPoint[];
  monthlyProgress: MonthlyProgressPoint[];
}

export default function AnalyticsCharts({
  velocitySeries,
  monthlyProgress,
}: AnalyticsChartsProps) {
  return (
    <div className="grid gap-4">
      <section className="rounded-2xl border border-white/10 bg-black/35 p-4">
        <p className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-zinc-500">
          Деградация скорости в подходе
        </p>
        <p className="mt-1 text-[0.65rem] text-zinc-600">
          Реконструкция по summary сессии (покадровый VBT Stage 4 не сохраняет).
        </p>
        {velocitySeries.length < 2 ? (
          <p className="py-8 text-center text-xs text-zinc-500">
            Недостаточно данных скорости для графика
          </p>
        ) : (
          <div className="mt-3 h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={velocitySeries}
                margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="analyticsVelFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "#71717a" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#71717a" }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid rgba(34,211,238,0.25)",
                    background: "#0a0f18",
                    color: "#e4e4e7",
                  }}
                  formatter={(value) => [`${value} м/с`, "Скорость"]}
                />
                <Area
                  type="monotone"
                  dataKey="velocityMs"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  fill="url(#analyticsVelFill)"
                  dot={{ r: 3, fill: "#22d3ee" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-black/35 p-4">
        <p className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-zinc-500">
          Прогресс за месяц
        </p>
        <p className="mt-1 text-[0.65rem] text-zinc-600">
          Ø скорость и оценка тоннажа (вес тела × reps). Рабочий вес в сессиях не
          пишется.
        </p>
        {monthlyProgress.length < 2 ? (
          <p className="py-8 text-center text-xs text-zinc-500">
            Нужно минимум две сессии за 30 дней
          </p>
        ) : (
          <div className="mt-3 h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={monthlyProgress}
                margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
              >
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: "#71717a" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="vel"
                  tick={{ fontSize: 10, fill: "#71717a" }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                />
                <YAxis
                  yAxisId="load"
                  orientation="right"
                  tick={{ fontSize: 10, fill: "#71717a" }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: "1px solid rgba(34,211,238,0.25)",
                    background: "#0a0f18",
                    color: "#e4e4e7",
                  }}
                  formatter={(value, name) => [
                    name === "avgVelocity" ? `${value} м/с` : `${value} кг`,
                    name === "avgVelocity" ? "Ø скорость" : "Оценка тоннажа",
                  ]}
                />
                <Line
                  yAxisId="vel"
                  type="monotone"
                  dataKey="avgVelocity"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  yAxisId="load"
                  type="monotone"
                  dataKey="estimatedLoadKg"
                  stroke="#a6ff2e"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="mt-2 flex gap-4 text-[0.6rem] text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan-300" />Ø скорость
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#a6ff2e]" />
            оценка тоннажа
          </span>
        </div>
      </section>
    </div>
  );
}
