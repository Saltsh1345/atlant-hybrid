"use client";

import { useEffect, useState } from "react";

export type AvatarFormat = "glb" | "fbx";

export interface AvatarAsset {
  url: string;
  format: AvatarFormat;
}

/** Prefer anatomical multi-mesh GLB in public/avatar.glb */
const PRIMARY: AvatarAsset = { url: "/avatar.glb", format: "glb" };
const FALLBACK: AvatarAsset = { url: "/avatar.fbx", format: "fbx" };

async function assetExists(url: string): Promise<boolean> {
  try {
    const head = await fetch(url, { method: "HEAD" });
    if (head.ok) return true;
    // Some hosts reject HEAD — try a tiny range GET
    const get = await fetch(url, {
      method: "GET",
      headers: { Range: "bytes=0-0" },
    });
    return get.ok || get.status === 206;
  } catch {
    return false;
  }
}

async function pickAvatarAsset(): Promise<AvatarAsset | null> {
  if (await assetExists(PRIMARY.url)) return PRIMARY;
  if (await assetExists(FALLBACK.url)) return FALLBACK;
  // Still try primary — Next serves public/ even if probe fails in some browsers
  return PRIMARY;
}

export function useAvatarAsset() {
  const [asset, setAsset] = useState<AvatarAsset | null>(PRIMARY);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(null);

    pickAvatarAsset()
      .then((picked) => {
        if (cancelled) return;
        setAsset(picked);
        setReady(true);
        if (!picked) setError("Файл avatar.glb не найден в /public");
      })
      .catch(() => {
        if (cancelled) return;
        setAsset(PRIMARY);
        setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    asset,
    available: asset !== null,
    ready,
    error,
  };
}
