"use client";

import type { LiveKinematics, Sport } from "@/types";
import GaugeMeter from "@/components/hud/GaugeMeter";

export default function VitalsHUD({
  kinematics,
}: {
  kinematics: LiveKinematics;
  sport: Sport;
}) {
  return (
    <div className="absolute right-3 bottom-28 left-3 z-20 grid grid-cols-2 gap-2 sm:grid-cols-4">
      <GaugeMeter
        label="Пульс"
        value={kinematics.bpm}
        min={55}
        max={185}
        unit="BPM"
        colorClass="text-rose-500"
      />
      <GaugeMeter
        label="Скорость"
        value={kinematics.velocityMs}
        min={0}
        max={4.5}
        unit="м/с"
        colorClass="text-sky-600"
      />
      <GaugeMeter
        label="Мощность"
        value={kinematics.powerW}
        min={0}
        max={700}
        unit="W"
        colorClass="text-violet-600"
      />
      <GaugeMeter
        label="Усталость"
        value={kinematics.fatiguePercent}
        min={0}
        max={100}
        unit="%"
        colorClass="text-amber-600"
      />
    </div>
  );
}
