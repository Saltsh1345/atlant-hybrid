"use client";

import { useEffect, useState } from "react";

export type AvatarFormat = "glb" | "fbx";

export interface AvatarAsset {
  url: string;
  format: AvatarFormat;
}

const CANDIDATES: AvatarAsset[] = [
  { url: "/avatar.fbx", format: "fbx" },
  { url: "/avatar.glb", format: "glb" },
];

/** HEAD only — never download multi-MB models just to probe. */
async function probeAsset(candidate: AvatarAsset): Promise<boolean> {
  try {
    const head = await fetch(candidate.url, { method: "HEAD" });
    return head.ok;
  } catch {
    return false;
  }
}

async function pickAvatarAsset(): Promise<AvatarAsset | null> {
  let best: AvatarAsset | null = null;
  let bestScore = -1;

  for (const candidate of CANDIDATES) {
    const ok = await probeAsset(candidate);
    if (!ok) continue;

    let score = candidate.format === "fbx" ? 2 : 1;
    try {
      const res = await fetch(candidate.url, { method: "HEAD" });
      const lm = res.headers.get("last-modified");
      if (lm) score += new Date(lm).getTime() / 1e15;
    } catch {
      /* keep default score */
    }

    if (score >= bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return best;
}

export function useAvatarAsset() {
  const [asset, setAsset] = useState<AvatarAsset | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    pickAvatarAsset().then((picked) => {
      if (!cancelled) {
        setAsset(picked);
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { asset, available: asset !== null, ready };
}
