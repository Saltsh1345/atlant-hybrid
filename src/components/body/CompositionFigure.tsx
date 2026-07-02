"use client";

interface CompositionFigureProps {
  fatPercent?: number;
  musclePercent?: number;
  compact?: boolean;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export default function CompositionFigure({
  fatPercent = 22,
  musclePercent = 40,
  compact,
}: CompositionFigureProps) {
  const fatLevel = clamp01((fatPercent - 8) / (38 - 8));
  const muscleLevel = clamp01((musclePercent - 30) / (60 - 30));

  const torsoOpacity = 0.25 + fatLevel * 0.6;
  const limbOpacity = 0.25 + muscleLevel * 0.6;
  const sizeClass = compact ? "h-40" : "h-56";

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl bg-gradient-to-b from-slate-100 to-slate-200 ${sizeClass}`}
    >
      <svg viewBox="0 0 200 320" className="h-full w-full">
        <rect x="0" y="0" width="200" height="320" fill="#f1f5f9" />

        <circle cx="100" cy="40" r="20" fill="#cbd5e1" />

        <rect x="70" y="68" width="60" height="98" rx="24" fill="#94a3b8" />
        <rect
          x="70"
          y="68"
          width="60"
          height="98"
          rx="24"
          fill="#f59e0b"
          fillOpacity={torsoOpacity}
        />

        <rect x="38" y="80" width="22" height="96" rx="10" fill="#94a3b8" />
        <rect x="140" y="80" width="22" height="96" rx="10" fill="#94a3b8" />
        <rect x="38" y="80" width="22" height="96" rx="10" fill="#22c55e" fillOpacity={limbOpacity} />
        <rect x="140" y="80" width="22" height="96" rx="10" fill="#22c55e" fillOpacity={limbOpacity} />

        <rect x="78" y="172" width="18" height="120" rx="10" fill="#94a3b8" />
        <rect x="104" y="172" width="18" height="120" rx="10" fill="#94a3b8" />
        <rect x="78" y="172" width="18" height="120" rx="10" fill="#22c55e" fillOpacity={limbOpacity} />
        <rect x="104" y="172" width="18" height="120" rx="10" fill="#22c55e" fillOpacity={limbOpacity} />
      </svg>

      <div className="absolute right-2 bottom-2 rounded-lg bg-white/90 px-2 py-1 text-[10px] text-slate-700">
        🟧 Жир: торс · 🟩 Мышцы: конечности
      </div>
    </div>
  );
}
