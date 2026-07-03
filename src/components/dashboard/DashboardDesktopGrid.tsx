"use client";

import { useCallback, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import type { Layout, LayoutItem } from "react-grid-layout";
import { useContainerWidth } from "react-grid-layout";
import Button from "@/components/ui/Button";
import {
  WIDGET_META,
  allWidgetIds,
  layoutForVisible,
  type DashboardWidgetId,
} from "@/lib/dashboard/widgets";
import { useDashboardLayoutStore } from "@/store/useDashboardLayoutStore";
import DashboardWidgetFrame from "@/components/dashboard/DashboardWidgetFrame";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const GridLayout = dynamic(
  () => import("react-grid-layout/legacy").then((m) => m.default),
  { ssr: false }
);

const ROW_HEIGHT = 44;
const COLS = 12;

interface DashboardDesktopGridProps {
  widgets: Partial<Record<DashboardWidgetId, ReactNode>>;
  showBodyTiles?: boolean;
}

export default function DashboardDesktopGrid({
  widgets,
  showBodyTiles = true,
}: DashboardDesktopGridProps) {
  const { width, containerRef, mounted } = useContainerWidth();
  const [pickerOpen, setPickerOpen] = useState(false);

  const layout = useDashboardLayoutStore((s) => s.layout);
  const visibleWidgets = useDashboardLayoutStore((s) => s.visibleWidgets);
  const editMode = useDashboardLayoutStore((s) => s.editMode);
  const setLayout = useDashboardLayoutStore((s) => s.setLayout);
  const setEditMode = useDashboardLayoutStore((s) => s.setEditMode);
  const addWidget = useDashboardLayoutStore((s) => s.addWidget);
  const removeWidget = useDashboardLayoutStore((s) => s.removeWidget);
  const resetLayout = useDashboardLayoutStore((s) => s.resetLayout);

  const activeLayout = layoutForVisible(visibleWidgets, layout);

  const onLayoutChange = useCallback(
    (next: Layout) => {
      if (!editMode) return;
      setLayout([...next]);
    },
    [editMode, setLayout]
  );

  const hiddenWidgets = allWidgetIds().filter(
    (id) =>
      !visibleWidgets.includes(id) &&
      (id !== "body-metrics" || showBodyTiles)
  );

  return (
    <div ref={containerRef} className="w-full">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-200/50 bg-white/70 px-4 py-3 backdrop-blur-md">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-700">
            Рабочий стол · 12 колонок
          </p>
          <p className="text-xs text-slate-500">
            {editMode
              ? "Перетащите за ⠿ · тяните угол для размера"
              : "Режим просмотра — включите редактирование для настройки"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {editMode && (
            <>
              <Button
                size="md"
                variant="secondary"
                className="!w-auto"
                onClick={() => setPickerOpen((v) => !v)}
              >
                {pickerOpen ? "Скрыть виджеты" : "+ Добавить"}
              </Button>
              <Button
                size="md"
                variant="ghost"
                className="!w-auto"
                onClick={() => {
                  if (
                    window.confirm("Сбросить расположение виджетов по умолчанию?")
                  ) {
                    resetLayout();
                  }
                }}
              >
                Сброс
              </Button>
            </>
          )}
          <Button
            size="md"
            className="!w-auto"
            variant={editMode ? "primary" : "secondary"}
            onClick={() => {
              setEditMode(!editMode);
              setPickerOpen(false);
            }}
          >
            {editMode ? "Готово" : "Редактировать"}
          </Button>
        </div>
      </div>

      {editMode && pickerOpen && hiddenWidgets.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2 rounded-2xl border border-dashed border-cyan-300/60 bg-cyan-50/40 p-3">
          {hiddenWidgets.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => addWidget(id)}
              className="rounded-xl border border-cyan-200 bg-white px-3 py-2 text-xs font-medium text-cyan-800 shadow-sm hover:bg-cyan-50"
            >
              {WIDGET_META[id].icon} {WIDGET_META[id].title}
            </button>
          ))}
        </div>
      )}

      {editMode && pickerOpen && hiddenWidgets.length === 0 && (
        <p className="mb-4 text-center text-xs text-slate-500">
          Все доступные виджеты уже на панели
        </p>
      )}

      {mounted && width > 0 && (
        <GridLayout
          className="dashboard-grid"
          width={width}
          layout={activeLayout}
          cols={COLS}
          rowHeight={ROW_HEIGHT}
          margin={[12, 12] as const}
          containerPadding={[0, 0] as const}
          isDraggable={editMode}
          isResizable={editMode}
          draggableHandle=".dashboard-drag-handle"
          resizeHandles={["se"]}
          onLayoutChange={onLayoutChange}
          compactType="vertical"
          preventCollision={false}
        >
          {visibleWidgets.map((id) => (
            <div
              key={id}
              className={`h-full ${id === "sport-picker" && editMode ? "pointer-events-auto" : ""}`}
            >
              <DashboardWidgetFrame
                id={id}
                editMode={editMode}
                onRemove={removeWidget}
              >
                {widgets[id] ?? (
                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                    Нет данных
                  </div>
                )}
              </DashboardWidgetFrame>
            </div>
          ))}
        </GridLayout>
      )}
    </div>
  );
}
