"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaInstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const dismissedBefore =
      typeof window !== "undefined" &&
      localStorage.getItem("atlant-pwa-dismissed") === "1";
    if (dismissedBefore) setDismissed(true);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferred || dismissed) return null;

  const install = async () => {
    await deferred.prompt();
    setDeferred(null);
  };

  const dismiss = () => {
    localStorage.setItem("atlant-pwa-dismissed", "1");
    setDismissed(true);
    setDeferred(null);
  };

  return (
    <Card className="mb-4 border-[var(--primary)]/20 bg-[var(--primary-muted)]">
      <p className="text-sm font-medium text-foreground">
        Установить Atlant-Hybrid
      </p>
      <p className="mt-1 text-xs text-muted">
        Добавьте на главный экран для быстрого доступа к тренировкам
      </p>
      <div className="mt-3 flex gap-2">
        <Button size="md" onClick={install} className="!w-auto">
          Установить
        </Button>
        <Button size="md" variant="ghost" onClick={dismiss} className="!w-auto">
          Позже
        </Button>
      </div>
    </Card>
  );
}
