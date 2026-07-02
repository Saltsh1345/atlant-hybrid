"use client";

import type { NormalizedLandmark } from "@/types";
import { LM } from "@/lib/pose/landmarks";

function tx(x: number): number {
  return (1 - x) * 100;
}
function ty(y: number): number {
  return y * 100;
}

function muscleBlob(
  x: number,
  y: number,
  rx: number,
  ry: number,
  lit: boolean
) {
  return (
    <ellipse
      cx={tx(x)}
      cy={ty(y)}
      rx={rx}
      ry={ry}
      fill={lit ? "rgba(74,222,128,0.55)" : "rgba(34,197,94,0.22)"}
      style={{ filter: lit ? "blur(2px)" : "blur(4px)" }}
    />
  );
}

export default function MuscleFatOverlay({
  landmarks,
  active,
  sweepPhase = 0,
}: {
  landmarks: NormalizedLandmark[] | null;
  active: boolean;
  sweepPhase?: number;
}) {
  if (!landmarks || !active) return null;

  const ls = landmarks[LM.L_SHOULDER];
  const rs = landmarks[LM.R_SHOULDER];
  const lh = landmarks[LM.L_HIP];
  const rh = landmarks[LM.R_HIP];
  const le = landmarks[LM.L_ELBOW];
  const re = landmarks[LM.R_ELBOW];
  const lw = landmarks[LM.L_WRIST];
  const rw = landmarks[LM.R_WRIST];
  const lk = landmarks[LM.L_KNEE];
  const rk = landmarks[LM.R_KNEE];
  const la = landmarks[LM.L_ANKLE];
  const ra = landmarks[LM.R_ANKLE];

  const sweepY = sweepPhase * 100;
  const lit = (y: number) => Math.abs(ty(y) - sweepY) < 14;

  const torsoMid = (ls.y + rs.y + lh.y + rh.y) / 4;
  const torsoLit = lit(torsoMid);

  const mid = (a: typeof ls, b: typeof ls) => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  });

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[13] h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <ellipse
        cx={tx((ls.x + rs.x + lh.x + rh.x) / 4)}
        cy={ty(torsoMid)}
        rx={Math.abs(tx(ls.x) - tx(rs.x)) / 2 + 4}
        ry={Math.abs(ty(lh.y) - ty(ls.y)) / 2 + 2}
        fill={torsoLit ? "rgba(251,191,36,0.5)" : "rgba(245,158,11,0.2)"}
        style={{ filter: "blur(6px)" }}
      />
      {muscleBlob(mid(ls, le).x, mid(ls, le).y, 3.5, 5, lit(mid(ls, le).y))}
      {muscleBlob(mid(le, lw).x, mid(le, lw).y, 3, 4.5, lit(mid(le, lw).y))}
      {muscleBlob(mid(rs, re).x, mid(rs, re).y, 3.5, 5, lit(mid(rs, re).y))}
      {muscleBlob(mid(re, rw).x, mid(re, rw).y, 3, 4.5, lit(mid(re, rw).y))}
      {muscleBlob(mid(lh, lk).x, mid(lh, lk).y, 3.5, 6, lit(mid(lh, lk).y))}
      {muscleBlob(mid(lk, la).x, mid(lk, la).y, 3, 5.5, lit(mid(lk, la).y))}
      {muscleBlob(mid(rh, rk).x, mid(rh, rk).y, 3.5, 6, lit(mid(rh, rk).y))}
      {muscleBlob(mid(rk, ra).x, mid(rk, ra).y, 3, 5.5, lit(mid(rk, ra).y))}
    </svg>
  );
}
