"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { KinematicSample } from "@/types";

interface VelocityChartProps {
  samples: KinematicSample[];
  height?: number;
}

export default function VelocityChart({
  samples,
  height = 120,
}: VelocityChartProps) {
  if (samples.length < 2) {
    return (
      <p className="py-4 text-center text-xs text-muted">
        Недостаточно данных для графика
      </p>
    );
  }

  const data = samples.map((s, i) => ({
    i,
    v: s.velocityMs,
    fatigue: s.fatigue,
  }));

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="velFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="i" hide />
          <YAxis
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
            }}
            formatter={(v) => [`${v} м/с`, "Скорость"]}
            labelFormatter={() => ""}
          />
          <Area
            type="monotone"
            dataKey="v"
            stroke="#0ea5e9"
            strokeWidth={2}
            fill="url(#velFill)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
