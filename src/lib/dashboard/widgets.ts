import type { LayoutItem } from "react-grid-layout";

export type DashboardWidgetId =
  | "sport-picker"
  | "activity"
  | "steps"
  | "load"
  | "pulse"
  | "water"
  | "sleep"
  | "macros"
  | "run"
  | "twin"
  | "readiness"
  | "plan"
  | "monitoring"
  | "body-metrics"
  | "progress"
  | "last-session"
  | "history"
  | "actions";

/** Cannot be removed from dashboard */
export const PINNED_WIDGETS: DashboardWidgetId[] = ["sport-picker"];

export interface WidgetMeta {
  title: string;
  icon: string;
  defaultLayout: Pick<LayoutItem, "w" | "h" | "minW" | "minH" | "maxW" | "maxH">;
}

export const WIDGET_META: Record<DashboardWidgetId, WidgetMeta> = {
  "sport-picker": {
    title: "Выбор тренировки",
    icon: "🏋️",
    defaultLayout: { w: 4, h: 6, minW: 3, minH: 5, maxW: 8, maxH: 10 },
  },
  activity: {
    title: "Активность",
    icon: "📊",
    defaultLayout: { w: 5, h: 6, minW: 4, minH: 5, maxW: 8, maxH: 10 },
  },
  steps: {
    title: "Активность (шаги)",
    icon: "👟",
    defaultLayout: { w: 2, h: 3, minW: 2, minH: 3, maxW: 4, maxH: 5 },
  },
  load: {
    title: "Нагрузка",
    icon: "🔥",
    defaultLayout: { w: 2, h: 3, minW: 2, minH: 3, maxW: 4, maxH: 5 },
  },
  pulse: {
    title: "Пульс / VBT",
    icon: "💓",
    defaultLayout: { w: 4, h: 4, minW: 3, minH: 3, maxW: 8, maxH: 6 },
  },
  water: {
    title: "Гидратация",
    icon: "💧",
    defaultLayout: { w: 2, h: 4, minW: 2, minH: 3, maxW: 4, maxH: 6 },
  },
  sleep: {
    title: "Восстановление",
    icon: "🌙",
    defaultLayout: { w: 2, h: 4, minW: 2, minH: 3, maxW: 4, maxH: 6 },
  },
  macros: {
    title: "Состав тела",
    icon: "⚖️",
    defaultLayout: { w: 4, h: 5, minW: 3, minH: 4, maxW: 8, maxH: 8 },
  },
  run: {
    title: "Последний пробег",
    icon: "🏃",
    defaultLayout: { w: 2, h: 3, minW: 2, minH: 3, maxW: 4, maxH: 5 },
  },
  twin: {
    title: "Цифровой двойник",
    icon: "🧬",
    defaultLayout: { w: 3, h: 10, minW: 3, minH: 6, maxW: 5, maxH: 14 },
  },
  readiness: {
    title: "Готовность мышц",
    icon: "💪",
    defaultLayout: { w: 4, h: 5, minW: 3, minH: 4, maxW: 8, maxH: 8 },
  },
  plan: {
    title: "План на сегодня",
    icon: "📋",
    defaultLayout: { w: 3, h: 5, minW: 3, minH: 4, maxW: 6, maxH: 8 },
  },
  monitoring: {
    title: "Мониторинг VBT",
    icon: "📡",
    defaultLayout: { w: 3, h: 3, minW: 2, minH: 3, maxW: 6, maxH: 6 },
  },
  "body-metrics": {
    title: "Метрики тела",
    icon: "📐",
    defaultLayout: { w: 4, h: 3, minW: 3, minH: 2, maxW: 8, maxH: 5 },
  },
  progress: {
    title: "Прогресс",
    icon: "📈",
    defaultLayout: { w: 6, h: 5, minW: 4, minH: 4, maxW: 12, maxH: 10 },
  },
  "last-session": {
    title: "Последняя тренировка",
    icon: "🎯",
    defaultLayout: { w: 6, h: 6, minW: 4, minH: 5, maxW: 12, maxH: 10 },
  },
  history: {
    title: "История",
    icon: "🕐",
    defaultLayout: { w: 6, h: 4, minW: 4, minH: 3, maxW: 12, maxH: 8 },
  },
  actions: {
    title: "Быстрые действия",
    icon: "⚡",
    defaultLayout: { w: 3, h: 4, minW: 2, minH: 3, maxW: 6, maxH: 6 },
  },
};

export const DEFAULT_VISIBLE_WIDGETS: DashboardWidgetId[] = [
  "sport-picker",
  "activity",
  "steps",
  "load",
  "pulse",
  "twin",
  "macros",
  "last-session",
  "plan",
  "progress",
  "history",
];

export const DEFAULT_GRID_LAYOUT: LayoutItem[] = [
  { i: "sport-picker", x: 0, y: 0, w: 4, h: 6, minW: 3, minH: 5 },
  { i: "activity", x: 4, y: 0, w: 5, h: 6, minW: 4, minH: 5 },
  { i: "twin", x: 9, y: 0, w: 3, h: 10, minW: 3, minH: 6 },
  { i: "steps", x: 0, y: 6, w: 2, h: 3, minW: 2, minH: 3 },
  { i: "load", x: 2, y: 6, w: 2, h: 3, minW: 2, minH: 3 },
  { i: "pulse", x: 4, y: 6, w: 5, h: 4, minW: 3, minH: 3 },
  { i: "macros", x: 0, y: 9, w: 4, h: 5, minW: 3, minH: 4 },
  { i: "last-session", x: 4, y: 10, w: 5, h: 5, minW: 4, minH: 4 },
  { i: "plan", x: 9, y: 10, w: 3, h: 5, minW: 3, minH: 4 },
  { i: "progress", x: 0, y: 14, w: 6, h: 5, minW: 4, minH: 4 },
  { i: "history", x: 6, y: 14, w: 6, h: 4, minW: 4, minH: 3 },
  { i: "water", x: 0, y: 19, w: 2, h: 4, minW: 2, minH: 3 },
  { i: "sleep", x: 2, y: 19, w: 2, h: 4, minW: 2, minH: 3 },
  { i: "run", x: 4, y: 19, w: 2, h: 3, minW: 2, minH: 3 },
  { i: "readiness", x: 6, y: 19, w: 4, h: 5, minW: 3, minH: 4 },
  { i: "monitoring", x: 10, y: 19, w: 2, h: 3, minW: 2, minH: 3 },
  { i: "actions", x: 10, y: 22, w: 2, h: 4, minW: 2, minH: 3 },
  { i: "body-metrics", x: 0, y: 23, w: 4, h: 3, minW: 3, minH: 2 },
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
    return { i: id, x: 0, y: maxY, ...meta };
  });
}

export function nextLayoutSlot(layout: LayoutItem[]): { x: number; y: number } {
  const maxY = layout.reduce((m, l) => Math.max(m, l.y + l.h), 0);
  return { x: 0, y: maxY };
}

export function allWidgetIds(): DashboardWidgetId[] {
  return Object.keys(WIDGET_META) as DashboardWidgetId[];
}
