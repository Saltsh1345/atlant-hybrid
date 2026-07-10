"use client";

import type { Sport } from "@/types";

/**
 * Body outline overlay — user fits inside before training; hidden during drill.
 */
export default function SilhouetteGuide({
  sport: _sport,
  progress,
  fit,
  visible,
}: {
  sport: Sport;
  progress: number;
  fit: boolean;
  visible: boolean;
}) {
  if (!visible) return null;

  const stroke = fit ? "rgba(52, 211, 153, 0.95)" : "rgba(34, 211, 238, 0.75)";
  const fill = fit ? "rgba(52, 211, 153, 0.12)" : "rgba(34, 211, 238, 0.08)";
  const glow = fit ? "drop-shadow(0 0 12px rgba(52,211,153,0.6))" : "drop-shadow(0 0 8px rgba(34,211,238,0.4))";

  return (
    <div className="pointer-events-none absolute inset-0 z-[20] flex items-center justify-center">
      <svg
        viewBox="0 0 100 100"
        className="h-[88%] max-h-[720px] w-auto transition-all duration-300"
        style={{ filter: glow }}
        aria-hidden
      >
        {/* head */}
        <ellipse cx="50" cy="18" rx="7" ry="8.5" fill={fill} stroke={stroke} strokeWidth="0.7" />
        {/* torso */}
        <path
          d="M38 28 L62 28 L58 52 L42 52 Z"
          fill={fill}
          stroke={stroke}
          strokeWidth="0.7"
          strokeLinejoin="round"
        />
        {/* arms — единый контур для всех видов спорта */}
        <path
          d="M38 30 L18 48 L22 52 L40 36 M62 30 L82 48 L78 52 L60 36"
          fill="none"
          stroke={stroke}
          strokeWidth="0.7"
          strokeLinecap="round"
        />
        {/* progress ring */}
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="0.5"
        />
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke={stroke}
          strokeWidth="1.2"
          strokeDasharray={`${progress * 289} 289`}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
      </svg>
      <p className="absolute bottom-[22%] left-0 right-0 text-center text-[11px] font-medium text-white/80">
        {fit ? "Скан… держите позу" : "Встаньте в контур"}
      </p>
    </div>
  );
}
