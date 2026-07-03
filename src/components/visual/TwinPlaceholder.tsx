"use client";

import { motion } from "framer-motion";

export type TwinPlaceholderMode = "offline" | "waiting" | "heatmap";

interface TwinPlaceholderProps {
  mode?: TwinPlaceholderMode;
  fatigue?: number;
  className?: string;
  compact?: boolean;
}

export default function TwinPlaceholder({
  mode = "offline",
  fatigue = 0,
  className = "",
  compact = false,
}: TwinPlaceholderProps) {
  const heat =
    fatigue > 55 ? "from-orange-500/20 to-red-500/10" : "from-cyan-500/15 to-emerald-500/10";
  const label =
    mode === "waiting"
      ? "[ ЗОНА 3D-ДВОЙНИКА: Ожидание калибровки... ]"
      : mode === "heatmap"
        ? "[ HEATMAP · VBT EMISSION ]"
        : "[ 3D SCANNER OFFLINE ]";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`flex h-full min-h-[200px] flex-col items-center justify-center rounded-2xl border border-cyan-500/30 bg-white/50 p-6 shadow-lg backdrop-blur-md ${className}`}
    >
      <div
        className={`mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-cyan-400/40 bg-gradient-to-br ${heat} ${compact ? "h-14 w-14" : ""}`}
      >
        <svg
          viewBox="0 0 48 48"
          className={`text-cyan-600 ${compact ? "h-8 w-8" : "h-10 w-10"}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="24" cy="14" r="5" />
          <path d="M12 42v-8c0-4 4-8 12-8s12 4 12 8v8" />
          <path d="M8 24h32M24 8v8" strokeDasharray="3 3" opacity="0.5" />
        </svg>
      </div>

      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-800/80">
        {label}
      </p>

      {mode === "heatmap" && (
        <div className="mt-4 w-full max-w-[200px]">
          <p className="mb-1 text-center font-mono text-[9px] uppercase text-slate-500">
            Усталость / emission
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200/80">
            <motion.div
              className={`h-full rounded-full ${
                fatigue > 55 ? "bg-gradient-to-r from-orange-500 to-red-500" : "bg-gradient-to-r from-cyan-400 to-emerald-500"
              }`}
              animate={{ width: `${Math.min(100, fatigue)}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <p className="mt-1 text-center font-mono text-xs tabular-nums text-slate-600">
            {Math.round(fatigue)}%
          </p>
        </div>
      )}

      <p className="mt-3 max-w-[220px] text-center text-[10px] leading-relaxed text-slate-500">
        High-poly mesh в разработке. Камера и VBT работают штатно.
      </p>
    </motion.div>
  );
}
