"use client";

import type { BioScanFinding, BioScanProfile } from "@/lib/training/bioScan/buildBioScanProfile";

const CATEGORY_LABELS: Record<BioScanFinding["category"], string> = {
  posture: "Осанка",
  proportion: "Пропорции",
  composition: "Состав тела",
  asymmetry: "Асимметрия",
  quality: "Качество скана",
};

const SEVERITY_STYLES: Record<
  BioScanFinding["severity"],
  { border: string; bg: string; badge: string }
> = {
  priority: {
    border: "border-amber-300/35",
    bg: "bg-amber-300/10",
    badge: "bg-amber-300/20 text-amber-200",
  },
  watch: {
    border: "border-cyan-300/25",
    bg: "bg-cyan-300/5",
    badge: "bg-cyan-300/15 text-cyan-200",
  },
  info: {
    border: "border-zinc-600/40",
    bg: "bg-zinc-900/60",
    badge: "bg-zinc-700/50 text-zinc-300",
  },
};

function FindingCard({ finding }: { finding: BioScanFinding }) {
  const style = SEVERITY_STYLES[finding.severity];
  return (
    <li
      className={`rounded-xl border p-3 ${style.border} ${style.bg}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide ${style.badge}`}>
          {CATEGORY_LABELS[finding.category]}
        </span>
      </div>
      <p className="mt-2 text-sm font-medium text-zinc-100">{finding.title}</p>
      <p className="mt-1 text-xs leading-5 text-zinc-400">{finding.detail}</p>
    </li>
  );
}

interface BioScanFindingsPanelProps {
  bioScan: BioScanProfile;
}

/** Полный список находок биоскана — не только гиперлордоз/таз. */
export default function BioScanFindingsPanel({ bioScan }: BioScanFindingsPanelProps) {
  const postureFindings = bioScan.findings.filter((f) => f.category === "posture");
  const otherFindings = bioScan.findings.filter((f) => f.category !== "posture");

  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-4">
        <p className="font-mono text-[10px] tracking-[0.25em] text-cyan-300/80">
          БИОВЕРИФИКАЦИЯ
        </p>
        <p className="mt-2 text-sm leading-relaxed text-zinc-200">
          {bioScan.summaryRu}
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          Комплекция (оценка):{" "}
          <span className="text-zinc-300">{bioScan.somatotype}</span>
          {bioScan.bodyFatPercent != null && (
            <>
              {" "}
              · % жира:{" "}
              <span className="text-zinc-300">{bioScan.bodyFatPercent}%</span>
            </>
          )}
        </p>
      </div>

      {postureFindings.length > 0 ? (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Осанка (профиль)
          </h2>
          <ul className="mt-2 space-y-2">
            {postureFindings.map((f) => (
              <FindingCard key={f.id} finding={f} />
            ))}
          </ul>
        </section>
      ) : (
        <div className="rounded-xl border border-emerald-300/25 bg-emerald-300/10 p-3">
          <p className="text-sm font-medium text-emerald-100">
            Выраженных признаков нарушения осанки не выявлено
          </p>
          <p className="mt-1 text-xs leading-5 text-zinc-400">
            Профильная оценка: таз, поясница и колени в пределах нормы по 2D-скану.
          </p>
        </div>
      )}

      {otherFindings.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Пропорции, состав и качество
          </h2>
          <ul className="mt-2 space-y-2">
            {otherFindings.map((f) => (
              <FindingCard key={f.id} finding={f} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
