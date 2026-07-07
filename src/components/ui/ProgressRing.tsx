"use client";

interface ProgressRingProps {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  className?: string;
}

export default function ProgressRing({
  value,
  size = 64,
  stroke = 6,
  color = "var(--readiness)",
  trackColor = "var(--border)",
  label,
  className = "",
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const arcLen = Math.PI * r;
  const dash = (clamped / 100) * arcLen;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size * 0.62 }}
      role="img"
      aria-label={label ?? `${clamped}%`}
    >
      <svg width={size} height={size * 0.62} viewBox={`0 0 ${size} ${size * 0.62}`}>
        <path
          d={`M ${stroke / 2 + 2} ${cy} A ${r} ${r} 0 0 1 ${size - stroke / 2 - 2} ${cy}`}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <path
          d={`M ${stroke / 2 + 2} ${cy} A ${r} ${r} 0 0 1 ${size - stroke / 2 - 2} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${arcLen}`}
          className="atlant-ring-progress"
        />
      </svg>
      {label ? (
        <span className="absolute bottom-0 text-[10px] font-bold text-[var(--readiness)]">
          {label}
        </span>
      ) : null}
    </div>
  );
}
