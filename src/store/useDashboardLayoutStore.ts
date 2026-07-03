import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LayoutItem } from "react-grid-layout";
import {
  DEFAULT_GRID_LAYOUT,
  DEFAULT_VISIBLE_WIDGETS,
  PINNED_WIDGETS,
  WIDGET_META,
  nextLayoutSlot,
  type DashboardWidgetId,
} from "@/lib/dashboard/widgets";

interface DashboardLayoutStore {
  layout: LayoutItem[];
  visibleWidgets: DashboardWidgetId[];
  editMode: boolean;
  focusSportPicker: boolean;
  setLayout: (layout: LayoutItem[]) => void;
  setEditMode: (editMode: boolean) => void;
  setFocusSportPicker: (v: boolean) => void;
  addWidget: (id: DashboardWidgetId) => void;
  removeWidget: (id: DashboardWidgetId) => void;
  resetLayout: () => void;
}

export const useDashboardLayoutStore = create<DashboardLayoutStore>()(
  persist(
    (set, get) => ({
      layout: DEFAULT_GRID_LAYOUT,
      visibleWidgets: DEFAULT_VISIBLE_WIDGETS,
      editMode: false,
      focusSportPicker: false,

      setLayout: (layout) => set({ layout }),
      setEditMode: (editMode) => set({ editMode }),
      setFocusSportPicker: (focusSportPicker) => set({ focusSportPicker }),

      addWidget: (id) => {
        const { visibleWidgets, layout } = get();
        if (visibleWidgets.includes(id)) return;
        const meta = WIDGET_META[id].defaultLayout;
        const slot = nextLayoutSlot(layout);
        set({
          visibleWidgets: [...visibleWidgets, id],
          layout: [...layout, { i: id, x: slot.x, y: slot.y, ...meta }],
        });
      },

      removeWidget: (id) => {
        if (PINNED_WIDGETS.includes(id)) return;
        const { visibleWidgets, layout } = get();
        set({
          visibleWidgets: visibleWidgets.filter((w) => w !== id),
          layout: layout.filter((l) => l.i !== id),
        });
      },

      resetLayout: () =>
        set({
          layout: DEFAULT_GRID_LAYOUT,
          visibleWidgets: DEFAULT_VISIBLE_WIDGETS,
        }),
    }),
    {
      name: "atlant-dashboard-layout-v2",
      partialize: (s) => ({
        layout: s.layout,
        visibleWidgets: s.visibleWidgets,
      }),
      version: 2,
      migrate: (persisted, version) => {
        if (version < 2) {
          return {
            layout: DEFAULT_GRID_LAYOUT,
            visibleWidgets: DEFAULT_VISIBLE_WIDGETS,
          };
        }
        return persisted as {
          layout: LayoutItem[];
          visibleWidgets: DashboardWidgetId[];
        };
      },
    }
  )
);
