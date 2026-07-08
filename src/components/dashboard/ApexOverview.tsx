"use client";

import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { OverviewData } from "@/lib/dashboard/overviewMetrics";
import { formatKg } from "@/lib/dashboard/overviewMetrics";
import AppIcon from "@/components/ui/AppIcon";

function Delta({ value, suffix = "%" }: { value: number; suffix?: string }) {
  const up = value >= 0;
  return (
    <p className={`text-xs ${up ? "text-[var(--neon-lime,#ccff00)]" : "text-[#f87171]"}`}>
      {up ? "↑" : "↓"} {up ? "+" : ""}
      {value}
      {suffix} к прошлой неделе
    </p>
  );
}

function KpiCard({
  label,
  value,
  delta,
  deltaSuffix,
}: {
  label: string;
  value: string;
  delta: number;
  deltaSuffix?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#141414] p-4">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#737373]">
        {label}
      </p>
      <p className="mb-1 text-2xl font-bold tracking-tight text-white">{value}</p>
      <Delta value={delta} suffix={deltaSuffix} />
    </div>
  );
}

function MuscleRings({ groups }: { groups: OverviewData["muscleGroups"] }) {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const radii = [78, 62, 46, 30];
  const stroke = 10;

  return (
    <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-center lg:justify-between">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        {groups.map((g, i) => {
          const r = radii[i];
          const c = 2 * Math.PI * r;
          const pct = Math.max(0, Math.min(100, g.pct));
          return (
            <g key={g.id}>
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={stroke}
              />
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={g.color}
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={`${(pct / 100) * c} ${c}`}
                transform={`rotate(-90 ${cx} ${cy})`}
              />
            </g>
          );
        })}
      </svg>
      <div className="grid w-full grid-cols-2 gap-3">
        {groups.map((g) => (
          <div key={g.id} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: g.color }}
            />
            <div>
              <p className="text-sm text-white">{g.label}</p>
              <p className="font-mono text-xs text-[#a3a3a3]">{g.pct}%</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ApexOverview({
  overview,
  twinScan,
  sportSelect,
}: {
  overview: OverviewData;
  twinScan?: ReactNode;
  sportSelect?: ReactNode;
}) {
  const { kpis } = overview;
  const maxDay = Math.max(1, ...overview.dailyVolume.map((d) => d.volume));

  return (
    <div className="flex flex-col gap-5">
      {sportSelect}
      {twinScan}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Недельный объём"
          value={formatKg(kpis.weeklyVolume)}
          delta={kpis.weeklyVolumeDeltaPct}
        />
        <KpiCard
          label="Тренировок выполнено"
          value={`${kpis.workoutsDone} / ${kpis.workoutsGoal}`}
          delta={kpis.workoutsDeltaPct}
        />
        <KpiCard
          label="Средняя сессия"
          value={`${kpis.avgSessionMin} мин`}
          delta={kpis.avgSessionDeltaMin}
          deltaSuffix=" мин"
        />
        <KpiCard
          label="Восстановление"
          value={`${kpis.recoveryScore} / 100`}
          delta={kpis.recoveryDelta}
          deltaSuffix=" пт"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-white/8 bg-[#141414] p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#737373]">
                На этой неделе
              </p>
              <h2 className="mt-1 text-lg font-semibold text-white">Объём тренировок</h2>
            </div>
            <span className="rounded-full bg-[var(--primary-muted)] px-2.5 py-1 font-mono text-[11px] text-[var(--neon-lime,#ccff00)]">
              ↑ {overview.volumeDeltaPct}%
            </span>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={overview.dailyVolume}>
                <defs>
                  <linearGradient id="volFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ccff00" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#ccff00" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#737373", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, maxDay]}
                  tick={{ fill: "#737373", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={36}
                  tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)}
                />
                <Tooltip
                  contentStyle={{
                    background: "#1c1c1c",
                    border: "1px solid #333",
                    borderRadius: 12,
                    color: "#fff",
                  }}
                  formatter={(v) => [formatKg(Number(v ?? 0)), "Объём"]}
                />
                <Area
                  type="monotone"
                  dataKey="volume"
                  stroke="#ccff00"
                  strokeWidth={2.5}
                  fill="url(#volFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-white/8 bg-[#141414] p-5">
          <div className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#737373]">
              На этой неделе
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">Группы мышц</h2>
          </div>
          <MuscleRings groups={overview.muscleGroups} />
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-white/8 bg-[#141414] p-5">
          <div className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#737373]">
              Железный протокол · {overview.programWeeks} недель
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">Тренировочная нагрузка</h2>
          </div>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overview.weekLoads}>
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#737373", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: "#1c1c1c",
                    border: "1px solid #333",
                    borderRadius: 12,
                    color: "#fff",
                  }}
                  formatter={(v) => [formatKg(Number(v ?? 0)), "Нагрузка"]}
                />
                <Bar dataKey="load" fill="#ccff00" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-sm text-[#a3a3a3]">
            Сейчас: неделя {overview.programWeek} —{" "}
            <span className="text-[var(--neon-lime,#ccff00)]">{overview.programPct}%</span>
          </p>
        </section>

        <section className="rounded-2xl border border-white/8 bg-[#141414] p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#737373]">
                Сегодня
              </p>
              <h2 className="mt-1 text-lg font-semibold text-white">
                {overview.recent[0]?.title ?? "Нет тренировки"}
              </h2>
            </div>
            {overview.recent[0] && (
              <span className="rounded-full bg-[var(--primary-muted)] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--neon-lime,#ccff00)]">
                Готово
              </span>
            )}
          </div>

          {overview.recent.length === 0 ? (
            <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 text-center">
              <AppIcon name="bolt" className="h-8 w-8 text-[#737373]" />
              <p className="text-sm text-[#737373]">
                Запиши первую тренировку — здесь появится план дня
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {overview.recent.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-white/4 px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{item.title}</p>
                    <p className="text-[11px] text-[#737373]">{item.when}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-mono text-xs text-white/90">{item.volumeLabel}</p>
                    <span className="h-2.5 w-2.5 rounded-sm bg-[var(--neon-lime,#ccff00)]" />
                  </div>
                </div>
              ))}
              <p className="pt-1 text-sm text-[#a3a3a3]">
                Всего в списке: {overview.recent.length} сессии
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
