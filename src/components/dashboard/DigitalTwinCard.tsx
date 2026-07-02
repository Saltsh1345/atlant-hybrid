"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import BiomechTwinPanel from "@/components/visual/BiomechTwinPanel";
import { useAvatarAsset } from "@/hooks/useAvatarAsset";
import type { LatchedBodyData } from "@/types";

interface DigitalTwinCardProps {
  bodyDataLocked: boolean;
  latchedBody: LatchedBodyData | null;
  onScan: () => void;
  onOpenLive?: () => void;
}

export default function DigitalTwinCard({
  bodyDataLocked,
  latchedBody,
  onScan,
  onOpenLive,
}: DigitalTwinCardProps) {
  const { asset, available, ready } = useAvatarAsset();
  const [showTwin, setShowTwin] = useState(false);
  const locked = bodyDataLocked && latchedBody;

  useEffect(() => {
    const t = window.setTimeout(() => setShowTwin(true), 200);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="atlant-metric-card mb-5 p-4">
      <div className="relative z-[1] mb-3 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-700">
            Цифровой двойник
          </p>
          <h2 className="text-lg font-bold text-slate-900">ATLANT · AR Mesh</h2>
          {locked ? (
            <p className="mt-0.5 font-mono text-[10px] text-cyan-600">
              [DATA LATCH ·{" "}
              {new Date(latchedBody.lockedAt).toLocaleDateString("ru-RU")}
              {asset && ` · ${asset.format.toUpperCase()}`}]
            </p>
          ) : (
            <p className="mt-0.5 text-[10px] text-amber-600">
              {!ready
                ? "Загрузка mesh-модели…"
                : !available
                  ? "Добавьте avatar.fbx в public/"
                  : "Пройдите скан для фиксации состава"}
            </p>
          )}
        </div>
        {locked && onOpenLive && (
          <button
            type="button"
            onClick={onOpenLive}
            className="rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-700 hover:bg-cyan-100"
          >
            Живой режим →
          </button>
        )}
      </div>

      {!locked && (
        <p className="relative z-[1] mb-2 text-[11px] text-rose-600">
          Состав тела не зафиксирован — запустите биосканирование
        </p>
      )}

      {showTwin ? (
        <BiomechTwinPanel
          latchedBody={latchedBody}
          locked={!!locked}
          tall
          showHud
        />
      ) : (
        <div className="flex h-64 items-center justify-center rounded-2xl bg-cyan-50/50 text-sm text-slate-400">
          Инициализация визуализации…
        </div>
      )}

      {locked ? (
        <div className="relative z-[1] mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-2 py-2 text-center">
            <p className="text-[9px] uppercase text-amber-700">Жир</p>
            <p className="text-lg font-bold text-amber-600">
              {latchedBody.fatPercent}%
            </p>
            <p className="text-[10px] text-amber-700/80">
              {latchedBody.fatMassKg} кг
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-2 py-2 text-center">
            <p className="text-[9px] uppercase text-emerald-700">Мышцы</p>
            <p className="text-lg font-bold text-emerald-600">
              {latchedBody.musclePercent}%
            </p>
          </div>
          <div className="rounded-xl border border-cyan-200/80 bg-cyan-50/80 px-2 py-2 text-center">
            <p className="text-[9px] uppercase text-cyan-700">Сухая масса</p>
            <p className="text-lg font-bold text-cyan-600">
              {latchedBody.leanMassKg}
            </p>
            <p className="text-[10px] text-cyan-700/80">кг</p>
          </div>
        </div>
      ) : null}

      {locked && latchedBody?.clothingDetected && (
        <p className="relative z-[1] mt-2 text-[10px] text-amber-700">
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
