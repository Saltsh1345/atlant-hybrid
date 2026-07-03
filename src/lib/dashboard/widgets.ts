import type { LayoutItem } from "react-grid-layout";

export type DashboardWidgetId =
  | "twin"
  | "readiness"
  | "plan"
  | "monitoring"
  | "body-metrics"
  | "progress"
  | "last-session"
  | "history"
  | "actions";

export interface WidgetMeta {
  title: string;
  icon: string;
  defaultLayout: Pick<LayoutItem, "w" | "h" | "minW" | "minH" | "maxW" | "maxH">;
  dataGated?: boolean;
}

export const WIDGET_META: Record<DashboardWidgetId, WidgetMeta> = {
  twin: {
    title: "Цифровой двойник",
    icon: "🧬",
    defaultLayout: { w: 7, h: 11, minW: 4, minH: 6, maxW: 12, maxH: 16 },
  },
  readiness: {
    title: "Готовность мышц",
    icon: "💪",
    defaultLayout: { w: 5, h: 6, minW: 3, minH: 4, maxW: 8, maxH: 10 },
  },
  plan: {
    title: "План на сегодня",
    icon: "📋",
    defaultLayout: { w: 5, h: 6, minW: 3, minH: 4, maxW: 8, maxH: 10 },
  },
  monitoring: {
    title: "Мониторинг VBT",
    icon: "📡",
    defaultLayout: { w: 5, h: 4, minW: 3, minH: 3, maxW: 8, maxH: 8 },
  },
  "body-metrics": {
    title: "Состав тела",
    icon: "⚖️",
    defaultLayout: { w: 7, h: 3, minW: 4, minH: 2, maxW: 12, maxH: 5 },
  },
  progress: {
    title: "Прогресс",
    icon: "📈",
    defaultLayout: { w: 6, h: 6, minW: 4, minH: 4, maxW: 12, maxH: 10 },
    dataGated: true,
  },
  "last-session": {
    title: "Последняя тренировка",
    icon: "🏋️",
    defaultLayout: { w: 6, h: 7, minW: 4, minH: 5, maxW: 12, maxH: 12 },
    dataGated: true,
  },
  history: {
    title: "История",
    icon: "🕐",
    defaultLayout: { w: 12, h: 5, minW: 4, minH: 3, maxW: 12, maxH: 10 },
    dataGated: true,
  },
  actions: {
    title: "Быстрые действия",
    icon: "⚡",
    defaultLayout: { w: 5, h: 4, minW: 3, minH: 3, maxW: 8, maxH: 6 },
  },
};

export const DEFAULT_VISIBLE_WIDGETS: DashboardWidgetId[] = [
  "twin",
  "readiness",
  "plan",
  "monitoring",
  "actions",
  "progress",
  "last-session",
  "history",
];

export const DEFAULT_GRID_LAYOUT: LayoutItem[] = [
  { i: "twin", x: 0, y: 0, w: 7, h: 11, minW: 4, minH: 6, maxW: 12, maxH: 16 },
  { i: "readiness", x: 7, y: 0, w: 5, h: 6, minW: 3, minH: 4, maxW: 8, maxH: 10 },
  { i: "plan", x: 7, y: 6, w: 5, h: 5, minW: 3, minH: 4, maxW: 8, maxH: 10 },
  { i: "monitoring", x: 7, y: 11, w: 5, h: 4, minW: 3, minH: 3, maxW: 8, maxH: 8 },
  { i: "actions", x: 7, y: 15, w: 5, h: 4, minW: 3, minH: 3, maxW: 8, maxH: 6 },
  { i: "body-metrics", x: 0, y: 11, w: 7, h: 3, minW: 4, minH: 2, maxW: 12, maxH: 5 },
  { i: "progress", x: 0, y: 14, w: 6, h: 6, minW: 4, minH: 4, maxW: 12, maxH: 10 },
  { i: "last-session", x: 6, y: 14, w: 6, h: 7, minW: 4, minH: 5, maxW: 12, maxH: 12 },
  { i: "history", x: 0, y: 21, w: 12, h: 5, minW: 4, minH: 3, maxW: 12, maxH: 10 },
];

export function layoutForVisible(
  visible: DashboardWidgetId[],
  saved: LayoutItem[]
): LayoutItem[] {
  const byId = new Map(saved.map((l) => [l.i, l]));
  return visible.map((id) => {
    const meta = WIDGET_META[id].defaultLayout;
    const existing = byId.get(id);
    if (existing) {
      return {
        ...existing,
        minW: meta.minW,
        minH: meta.minH,
        maxW: meta.maxW,
        maxH: meta.maxH,
      };
    }
    const maxY = saved.reduce((m, l) => Math.max(m, l.y + l.h), 0);
    return {
      i: id,
      x: 0,
      y: maxY,
      ...meta,
    };
  });
}

export function nextLayoutSlot(layout: LayoutItem[]): { x: number; y: number } {
  const maxY = layout.reduce((m, l) => Math.max(m, l.y + l.h), 0);
  return { x: 0, y: maxY };
}
