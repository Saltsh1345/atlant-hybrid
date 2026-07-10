"use client";

import Card from "@/components/ui/Card";
import {
  eliteScoreLabel,
  eliteSessionSummary,
  PRO_DATASET_CATALOG,
} from "@/lib/elite";
import type { Sport } from "@/types";

interface EliteBenchmarkCardProps {
  sport: Sport;
  drillAvgElite?: number;
}

export default function EliteBenchmarkCard({
  sport,
  drillAvgElite = 0,
}: EliteBenchmarkCardProps) {
  const summary = eliteSessionSummary();
  const overall =
    drillAvgElite > 0 ? drillAvgElite : summary.avgOverall;

  if (overall <= 0 && summary.count === 0) return null;

  const datasets = PRO_DATASET_CATALOG.filter((d) => d.sport === sport);

  return (
    <Card className="mb-4 border border-[var(--primary)]/25">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--primary)]">
        Olympic Track · сравнение с элитой
      </p>
      <p className="mb-3 text-[11px] text-muted">
        Оценка по биомеханике профи (не по вашим прошлым тренировкам)
      </p>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-background-secondary px-2 py-3">
          <p className="text-[9px] uppercase text-muted">Эталон</p>
          <p
            className={`text-xl font-bold tabular-nums ${
              overall >= 75
                ? "text-success"
                : overall >= 55
                  ? "text-primary"
                  : "text-warning"
            }`}
          >
            {overall}%
          </p>
          <p className="text-[10px] text-muted">{eliteScoreLabel(overall)}</p>
        </div>
        <div className="rounded-xl bg-background-secondary px-2 py-3">
          <p className="text-[9px] uppercase text-muted">Техника</p>
          <p className="text-xl font-bold tabular-nums text-foreground">
            {summary.avgTechnique || overall}%
          </p>
        </div>
        <div className="rounded-xl bg-background-secondary px-2 py-3">
          <p className="text-[9px] uppercase text-muted">Действие</p>
          <p className="text-xl font-bold tabular-nums text-foreground">
            {summary.avgActionMatch || "—"}
            {summary.avgActionMatch ? "%" : ""}
          </p>
        </div>
      </div>

      {summary.topDeviations.length > 0 && (
        <div className="mt-3 rounded-lg bg-background-secondary px-3 py-2">
          <p className="text-[10px] font-medium uppercase text-muted">
            Главные отклонения от эталона
          </p>
          <ul className="mt-1 list-inside list-disc text-xs text-foreground-secondary">
            {summary.topDeviations.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
      )}

      {datasets.length > 0 && (
        <details className="mt-3 text-xs text-muted">
          <summary className="cursor-pointer font-medium text-foreground-secondary">
            Pro-датасеты в библиотеке ({datasets.length})
          </summary>
          <ul className="mt-2 space-y-2">
            {datasets.map((d) => (
              <li key={d.id}>
                <a
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  {d.name}
                </a>
                <span className="block text-[10px]">{d.notes}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  );
}
