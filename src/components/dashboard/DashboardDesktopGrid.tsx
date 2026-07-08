"use client";

import type { ReactNode } from "react";
import DashboardWidgetFrame from "@/components/dashboard/DashboardWidgetFrame";
import {
  dashboardSections,
  type DashboardSection,
  type DashboardWidgetId,
} from "@/lib/dashboard/widgets";

interface DashboardDesktopGridProps {
  widgets: Partial<Record<DashboardWidgetId, ReactNode>>;
  showBodyTiles?: boolean;
}

function WidgetCell({
  id,
  widgets,
  className,
}: {
  id: DashboardWidgetId;
  widgets: Partial<Record<DashboardWidgetId, ReactNode>>;
  className?: string;
}) {
  return (
    <div className={`min-h-0 ${className ?? ""}`}>
      <DashboardWidgetFrame id={id}>
        {widgets[id] ?? (
          <div className="flex h-full min-h-[80px] items-center justify-center text-xs text-muted">
            Нет данных
          </div>
        )}
      </DashboardWidgetFrame>
    </div>
  );
}

function SectionHeader({ section }: { section: DashboardSection }) {
  return (
    <header className="mb-3">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
        {section.title}
      </h2>
      {section.subtitle && (
        <p className="mt-0.5 text-xs text-muted">{section.subtitle}</p>
      )}
    </header>
  );
}

function HeroSection({
  section,
  widgets,
}: {
  section: DashboardSection;
  widgets: Partial<Record<DashboardWidgetId, ReactNode>>;
}) {
  return (
    <section>
      <SectionHeader section={section} />
      <div className="atlant-dash-hero">
        <WidgetCell id="sport-picker" widgets={widgets} className="atlant-dash-sport" />
        <WidgetCell id="rings" widgets={widgets} className="atlant-dash-rings" />
        <div className="atlant-dash-metrics">
          <WidgetCell id="steps" widgets={widgets} />
          <WidgetCell id="load" widgets={widgets} />
          <WidgetCell id="pulse" widgets={widgets} />
        </div>
        <WidgetCell id="twin" widgets={widgets} className="atlant-dash-twin" />
      </div>
    </section>
  );
}

function SplitSection({
  section,
  widgets,
}: {
  section: DashboardSection;
  widgets: Partial<Record<DashboardWidgetId, ReactNode>>;
}) {
  return (
    <section>
      <SectionHeader section={section} />
      <div className="atlant-dash-split">
        {section.widgets.map((id) => (
          <WidgetCell key={id} id={id} widgets={widgets} />
        ))}
      </div>
    </section>
  );
}

function CardsSection({
  section,
  widgets,
}: {
  section: DashboardSection;
  widgets: Partial<Record<DashboardWidgetId, ReactNode>>;
}) {
  return (
    <section>
      <SectionHeader section={section} />
      <div className="atlant-dash-cards">
        {section.widgets.map((id) => (
          <WidgetCell key={id} id={id} widgets={widgets} />
        ))}
      </div>
    </section>
  );
}

function FullSection({
  section,
  widgets,
}: {
  section: DashboardSection;
  widgets: Partial<Record<DashboardWidgetId, ReactNode>>;
}) {
  return (
    <section>
      <SectionHeader section={section} />
      <div className="atlant-dash-full">
        {section.widgets.map((id) => (
          <WidgetCell key={id} id={id} widgets={widgets} />
        ))}
      </div>
    </section>
  );
}

function renderSection(
  section: DashboardSection,
  widgets: Partial<Record<DashboardWidgetId, ReactNode>>
) {
  switch (section.layout) {
    case "hero":
      return <HeroSection key={section.id} section={section} widgets={widgets} />;
    case "split":
      return <SplitSection key={section.id} section={section} widgets={widgets} />;
    case "cards":
      return <CardsSection key={section.id} section={section} widgets={widgets} />;
    case "full":
      return <FullSection key={section.id} section={section} widgets={widgets} />;
    default:
      return null;
  }
}

export default function DashboardDesktopGrid({
  widgets,
  showBodyTiles = true,
}: DashboardDesktopGridProps) {
  const sections = dashboardSections(showBodyTiles);

  return (
    <div className="flex flex-col gap-8">
      {sections.map((section) => renderSection(section, widgets))}
    </div>
  );
}
