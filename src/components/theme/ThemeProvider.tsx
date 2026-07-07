"use client";

import { useEffect } from "react";
import { applyThemeToDom, useThemeStore } from "@/store/useThemeStore";

function resolveFromMode(mode: "light" | "dark" | "system"): "light" | "dark" {
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return mode;
}

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const mode = useThemeStore((s) => s.mode);

  useEffect(() => {
    const resolved = resolveFromMode(mode);
    applyThemeToDom(resolved);
    useThemeStore.setState({ resolved });

    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const r = mq.matches ? "dark" : "light";
      applyThemeToDom(r);
      useThemeStore.setState({ resolved: r });
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  return <>{children}</>;
}
