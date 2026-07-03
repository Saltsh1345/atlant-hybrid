import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LayoutItem } from "react-grid-layout";
import {
  DEFAULT_GRID_LAYOUT,
  DEFAULT_VISIBLE_WIDGETS,
  WIDGET_META,
  nextLayoutSlot,
  type DashboardWidgetId,
} from "@/lib/dashboard/widgets";

interface DashboardLayoutStore {
  layout: LayoutItem[];
  visibleWidgets: DashboardWidgetId[];
  editMode: boolean;
  setLayout: (layout: LayoutItem[]) => void;
  setEditMode: (editMode: boolean) => void;
  addWidget: (id: DashboardWidgetId) => void;
  removeWidget: (id: DashboardWidgetId) => void;
  resetLayout: () => void;
}

export const useDashboardLayoutStore = create<DashboardLayoutStore>()(
  persist(
    (set, get) => ({
      layout: DEFAULT_GRID_LAYOUT,
      visibleWidgets: DEFAULT_VISIBLE_WIDGETS.filter(
        (id) => id !== "body-metrics"
      ),
      editMode: false,

      setLayout: (layout) => set({ layout }),

      setEditMode: (editMode) => set({ editMode }),

      addWidget: (id) => {
        const { visibleWidgets, layout } = get();
        if (visibleWidgets.includes(id)) return;

        const meta = WIDGET_META[id].defaultLayout;
        const slot = nextLayoutSlot(layout);
        const item: LayoutItem = {
          i: id,
          x: slot.x,
          y: slot.y,
          ...meta,
        };

        set({
          visibleWidgets: [...visibleWidgets, id],
          layout: [...layout, item],
        });
      },

      removeWidget: (id) => {
        const { visibleWidgets, layout } = get();
        set({
          visibleWidgets: visibleWidgets.filter((w) => w !== id),
          layout: layout.filter((l) => l.i !== id),
        });
      },

      resetLayout: () =>
        set({
          layout: DEFAULT_GRID_LAYOUT,
          visibleWidgets: DEFAULT_VISIBLE_WIDGETS.filter(
            (w) => w !== "body-metrics"
          ),
        }),
    }),
    {
      name: "atlant-dashboard-layout",
      partialize: (s) => ({
        layout: s.layout,
        visibleWidgets: s.visibleWidgets,
      }),
    }
  )
);
