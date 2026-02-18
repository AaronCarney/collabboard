"use client";

import type { BoardObject } from "@/types/board";
import { clsx } from "clsx";

interface PropertyPanelProps {
  selectedObjects: BoardObject[];
  onUpdateObjects: (ids: string[], changes: Partial<BoardObject>) => void;
}

const COLOR_SWATCHES = [
  "#FFEB3B",
  "#FF9800",
  "#F44336",
  "#E91E63",
  "#9C27B0",
  "#3F51B5",
  "#42A5F5",
  "#66BB6A",
  "#8D6E63",
  "#607D8B",
];

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function PropertyPanel({ selectedObjects, onUpdateObjects }: PropertyPanelProps) {
  const ids = selectedObjects.map((o) => o.id);
  const colors = new Set(selectedObjects.map((o) => o.color));
  const currentColor = colors.size === 1 ? [...colors][0] : null;

  return (
    <div className="absolute bottom-4 right-4 z-50 bg-white rounded-xl shadow-lg border p-3 w-48">
      <div className="text-xs font-medium text-gray-500 mb-2">
        {selectedObjects.length === 1
          ? "Color"
          : `Color (${String(selectedObjects.length)} objects)`}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {COLOR_SWATCHES.map((color) => (
          <button
            key={color}
            onClick={() => {
              onUpdateObjects(ids, { color });
            }}
            className={clsx(
              "w-7 h-7 rounded-md border-2 transition-transform hover:scale-110",
              currentColor === color ? "border-gray-800 scale-110" : "border-gray-200"
            )}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
      {colors.size > 1 && <div className="text-xs text-gray-400 mt-2 italic">Mixed colors</div>}
    </div>
  );
}
