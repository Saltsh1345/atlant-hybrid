"use client";

import type { ReadinessReport } from "@/lib/readiness";

export default function MuscleReadinessCard({
  report,
  className = "",
}: {
  report: ReadinessReport;
  className?: string;
}) {
  if (report.overall === 0) {
    return (
      <div className={`atlant-metric-card p-4 md:p-5 ${className}`}>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-700">
          Готовность мышц
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Пройдите биосканирование для расчёта
        </p>
      </div>
    );
  }

  return (
    <div className={`atlant-metric-card p-4 md:p-5 ${className}`}>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-600">
            Прогресс нагрузки
          </p>
          <p className="text-3xl font-bold text-orange-500">{report.overall}%</p>
          <p className="text-xs text-slate-500">{report.label}</p>
        </div>
        <div className="relative flex h-16 w-16 items-center justify-center">
          <svg width="64" height="40" viewBox="0 0 64 40">
            <path
              d="M 8 32 A 24 24 0 0 1 56 32"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d="M 8 32 A 24 24 0 0 1 56 32"
              fill="none"
              stroke="#f97316"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${(report.overall / 100) * 75} 75`}
            />
          </svg>
          <span className="absolute bottom-0 text-xs font-bold text-orange-600">
            Load
          </span>
        </div>
      </div>
      <div className="space-y-2">
        {report.groups.map((g) => (
          <div key={g.name}>
            <div className="mb-0.5 flex justify-between text-xs">
              <span className="text-slate-600">{g.name}</span>
              <span className="font-mono font-medium text-cyan-800">{g.percent}%</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-500 transition-all"
                style={{ width: `${g.percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
