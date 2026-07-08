"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import BiomechTwinPanel from "@/components/visual/BiomechTwinPanel";
import { useAvatarAsset } from "@/hooks/useAvatarAsset";
import type { LatchedBodyData, SessionSummary } from "@/types";

interface DigitalTwinCardProps {
  bodyDataLocked: boolean;
  latchedBody: LatchedBodyData | null;
  onScan: () => void;
  onOpenLive?: () => void;
  className?: string;
  lastSession?: SessionSummary | null;
  calm?: boolean;
}

export default function DigitalTwinCard({
  bodyDataLocked,
  latchedBody,
  onScan,
  onOpenLive,
  className = "",
  lastSession = null,
  calm = false,
}: DigitalTwinCardProps) {
  const { asset, available, ready } = useAvatarAsset();
  const [showTwin, setShowTwin] = useState(false);
  const locked = bodyDataLocked && latchedBody;

  useEffect(() => {
    const t = window.setTimeout(() => setShowTwin(true), 200);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className={`atlant-metric-card flex h-full flex-col p-4 md:p-5 ${className}`}>
      <div className="relative z-[1] mb-3 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            Цифровой двойник
          </p>
          <h2 className="text-lg font-bold text-foreground">ATLANT · AR Mesh</h2>
          {locked ? (
            <p className="mt-0.5 font-mono text-[10px] text-primary">
              [DATA LATCH ·{" "}
              {new Date(latchedBody.lockedAt).toLocaleDateString("ru-RU")}
              {asset && ` · ${asset.format.toUpperCase()}`}]
            </p>
          ) : (
          <p className="mt-0.5 text-[10px] text-[#a3a3a3]">
            {!ready
              ? "Загрузка mesh-модели…"
              : !available
                ? "Добавьте avatar.glb в public/"
                : calm
                  ? "Голограмма · мышцы и жир активны"
                  : "Пройдите скан для фиксации состава"}
          </p>
          )}
        </div>
        {locked && onOpenLive && (
          <button
            type="button"
            onClick={onOpenLive}
            className="rounded-lg border border-[var(--primary)]/30 bg-[var(--primary-muted)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary transition hover:bg-[var(--primary)]/20"
          >
            Живой режим →
          </button>
        )}
      </div>

      {!locked && (
        <p className="relative z-[1] mb-2 text-[11px] text-danger">
          Состав тела не зафиксирован — запустите биосканирование
        </p>
      )}

      {showTwin ? (
        <div className="min-h-0 flex-1">
          <BiomechTwinPanel
            latchedBody={latchedBody}
            locked={!!locked}
            lastSession={lastSession}
            tall
            showHud
            calm={calm}
            className="h-full min-h-[220px]"
          />
        </div>
      ) : (
        <div className="flex h-64 items-center justify-center rounded-2xl bg-[var(--primary-muted)] text-sm text-muted">
          Инициализация визуализации…
        </div>
      )}

      {locked ? (
        <div className="relative z-[1] mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-[var(--warning)]/30 bg-[var(--readiness-muted)] px-2 py-2 text-center">
            <p className="text-[9px] uppercase text-readiness">Жир</p>
            <p className="text-lg font-bold text-readiness">
              {latchedBody.fatPercent}%
            </p>
            <p className="text-[10px] text-muted">{latchedBody.fatMassKg} кг</p>
          </div>
          <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-muted)] px-2 py-2 text-center">
            <p className="text-[9px] uppercase text-success">Мышцы</p>
            <p className="text-lg font-bold text-success">
              {latchedBody.musclePercent}%
            </p>
          </div>
          <div className="rounded-xl border border-[var(--primary)]/30 bg-[var(--primary-muted)] px-2 py-2 text-center">
            <p className="text-[9px] uppercase text-primary">Сухая масса</p>
            <p className="text-lg font-bold text-primary">
              {latchedBody.leanMassKg}
            </p>
            <p className="text-[10px] text-muted">кг</p>
          </div>
        </div>
      ) : null}

      {locked && latchedBody?.clothingDetected && (
        <p className="relative z-[1] mt-2 text-[10px] text-warning">
          Одежда учтена — оценка приблизительная
        </p>
      )}

      <div className="relative z-[1] mt-4">
        {locked ? (
          <Button size="md" variant="secondary" className="!w-auto" onClick={onScan}>
            Пересканировать
          </Button>
        ) : (
          <Button size="lg" onClick={onScan}>
            {available ? "Зафиксировать состав (скан)" : "Создать цифровой двойник"}
          </Button>
        )}
      </div>
    </div>
  );
}
