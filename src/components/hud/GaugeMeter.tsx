"use client";

interface GaugeMeterProps {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  colorClass?: string;
  compact?: boolean;
  minimal?: boolean;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export default function GaugeMeter({
  label,
  value,
  min,
  max,
  unit,
  colorClass = "text-sky-600",
  compact,
  minimal,
}: GaugeMeterProps) {
  const safe = clamp(value, min, max);
  const ratio = (safe - min) / Math.max(1, max - min);

  const r = minimal ? 18 : compact ? 24 : 30;
  const cx = minimal ? 28 : 36;
  const cy = minimal ? 28 : 36;
  const c = Math.PI * r;
  const dash = c * ratio;
  const remain = c - dash;
  const svgW = minimal ? 56 : 72;
  const svgH = minimal ? 34 : 42;

  return (
    <div
      className={
        minimal
          ? "text-center"
          : "health-card bg-white/92 px-2 py-2 text-center backdrop-blur-sm"
      }
    >
      <p
        className={`uppercase tracking-wide text-muted ${
          minimal ? "text-[8px]" : "text-[10px]"
        }`}
      >
        {label}
      </p>
      <div className="mx-auto mt-0.5 flex w-fit items-center justify-center">
        <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke="currentColor"
            className={colorClass}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${remain}`}
          />
        </svg>
      </div>
      <p
        className={`font-bold ${colorClass} ${
          minimal ? "text-xs" : "-mt-1 text-sm"
        }`}
      >
        {Math.round(safe)}
        <span
          className={`ml-0.5 font-normal text-muted ${
            minimal ? "text-[8px]" : "text-[10px]"
          }`}
        >
          {unit}
        </span>
      </p>
    </div>
  );
}
