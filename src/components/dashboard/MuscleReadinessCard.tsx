"use client";

import type { ReadinessReport } from "@/lib/readiness";
import ReadinessRing from "@/components/ui/ReadinessRing";

export default function MuscleReadinessCard({
  report,
  className = "",
}: {
  report: ReadinessReport;
  className?: string;
}) {
  return (
    <ReadinessRing
      overall={report.overall}
      label={report.label}
      groups={report.overall > 0 ? report.groups : undefined}
      emptyText="Пройдите биосканирование для расчёта"
      className={className}
    />
  );
}
