export type DashboardWidgetId =
  | "sport-picker"
  | "rings"
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

import type { AppIconName } from "@/components/ui/AppIcon";

export interface WidgetMeta {
  title: string;
  icon: AppIconName;
}

export const WIDGET_META: Record<DashboardWidgetId, WidgetMeta> = {
  "sport-picker": { title: "Выбор тренировки", icon: "train" },
  rings: { title: "Кольца активности", icon: "rings" },
  activity: { title: "Активность", icon: "activity" },
  steps: { title: "Шаги", icon: "steps" },
  load: { title: "Нагрузка", icon: "load" },
  pulse: { title: "Пульс / VBT", icon: "pulse" },
  water: { title: "Гидратация", icon: "water" },
  sleep: { title: "Восстановление", icon: "sleep" },
  macros: { title: "Состав тела", icon: "macros" },
  run: { title: "Последний пробег", icon: "run" },
  twin: { title: "Цифровой двойник", icon: "twin" },
  readiness: { title: "Готовность мышц", icon: "readiness" },
  plan: { title: "План на сегодня", icon: "plan" },
  monitoring: { title: "Мониторинг VBT", icon: "monitoring" },
  "body-metrics": { title: "Метрики тела", icon: "body-metrics" },
  progress: { title: "Прогресс", icon: "progress" },
  "last-session": { title: "Последняя тренировка", icon: "last-session" },
  history: { title: "История", icon: "history" },
  actions: { title: "Быстрые действия", icon: "actions" },
};

/** Widgets without a card header — they have their own visual chrome */
export const WIDGETS_WITHOUT_HEADER: DashboardWidgetId[] = [
  "sport-picker",
  "activity",
  "rings",
];

export type DashboardSectionLayout = "hero" | "metrics" | "split" | "cards" | "full";

export interface DashboardSection {
  id: string;
  title: string;
  subtitle?: string;
  layout: DashboardSectionLayout;
  widgets: DashboardWidgetId[];
}

export const DASHBOARD_SECTIONS: DashboardSection[] = [
  {
    id: "start",
    title: "Старт",
    subtitle: "Выберите тренировку и оцените форму",
    layout: "hero",
    widgets: ["sport-picker", "rings", "steps", "load", "pulse", "twin"],
  },
  {
    id: "activity",
    title: "Активность",
    subtitle: "Недельная динамика и состав тела",
    layout: "split",
    widgets: ["activity", "macros"],
  },
  {
    id: "training",
    title: "Тренировка",
    subtitle: "План, последняя сессия и прогресс",
    layout: "cards",
    widgets: ["last-session", "plan", "progress"],
  },
  {
    id: "history",
    title: "История",
    layout: "full",
    widgets: ["history"],
  },
];

export function dashboardSections(showBodyTiles: boolean): DashboardSection[] {
  if (!showBodyTiles) return DASHBOARD_SECTIONS;
  return [
    ...DASHBOARD_SECTIONS.slice(0, 2),
    {
      id: "body",
      title: "Скан тела",
      layout: "full",
      widgets: ["body-metrics"],
    },
    ...DASHBOARD_SECTIONS.slice(2),
  ];
}

export function allWidgetIds(): DashboardWidgetId[] {
  return Object.keys(WIDGET_META) as DashboardWidgetId[];
}
