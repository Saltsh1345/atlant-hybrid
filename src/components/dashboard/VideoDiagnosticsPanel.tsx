"use client";

import type { VideoDiagnosticReport } from "@/types/training";
import { weakZoneMeshes } from "@/lib/diagnostics/videoDiagnostics";

export default function VideoDiagnosticsPanel({
  report,
  onOpenTwin,
}: {
  report: VideoDiagnosticReport | null;
  onOpenTwin?: () => void;
}) {
  if (!report) {
    return (
      <div className="rounded-2xl border border-white/8 bg-[#141414] p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#737373]">
          Видеодиагностика
        </p>
        <p className="mt-2 text-sm text-[#a3a3a3]">
          Пройдите биоскан и хотя бы одну тренировку с камерой — система построит
          карту слабых зон и мышечных дисбалансов.
        </p>
      </div>
    );
  }

  const meshCount = weakZoneMeshes(report).length;

  return (
    <div className="rounded-2xl border border-cyan-500/25 bg-[#141414] p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400">
            Видеодиагностика
          </p>
          <p className="mt-1 text-xl font-bold text-white">
            {report.overallScore}/100
          </p>
          <p className="text-xs text-cyan-200/80">{report.label}</p>
        </div>
        {onOpenTwin && meshCount > 0 && (
          <button
            type="button"
            onClick={onOpenTwin}
            className="shrink-0 rounded-lg border border-cyan-500/40 px-2.5 py-1 text-[10px] font-semibold uppercase text-cyan-300"
          >
            На двойнике →
          </button>
        )}
      </div>

      <p className="mb-3 text-[10px] text-[#737373]">
        Источники: {report.sourcesUsed.join(" · ")}
      </p>

      {report.weakZones.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase text-amber-300">
            Слабые зоны
          </p>
          {report.weakZones.slice(0, 5).map((z) => (
            <div
              key={z.id}
              className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-amber-100">
                  {z.muscleGroup}
                  {z.side && z.side !== "both" ? ` (${z.side})` : ""}
                </span>
                <span className="font-mono text-xs text-amber-300">
                  {z.severity}%
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-amber-200/70">
                {z.causes[0]}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-emerald-300">Критичных слабых зон не выявлено</p>
      )}

      {report.strengths.length > 0 && (
        <ul className="mt-3 list-inside list-disc text-xs text-emerald-200/80">
          {report.strengths.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
