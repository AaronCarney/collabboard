"use client";

import { clsx } from "clsx";

export type GridStyle = "dots" | "lines" | "none";

interface BoardSettingsProps {
  gridStyle: GridStyle;
  backgroundColor: string;
  onGridStyleChange: (style: GridStyle) => void;
  onBackgroundColorChange: (color: string) => void;
}

const GRID_STYLES: { label: string; value: GridStyle }[] = [
  { label: "Dots", value: "dots" },
  { label: "Lines", value: "lines" },
  { label: "None", value: "none" },
];

const BG_COLORS = ["#FFFFFF", "#F5F5F5", "#E8EAF6", "#FFF3E0", "#E8F5E9", "#FCE4EC"];

export function BoardSettings({
  gridStyle,
  backgroundColor,
  onGridStyleChange,
  onBackgroundColorChange,
}: BoardSettingsProps): React.JSX.Element {
  return (
    <div className="absolute top-14 right-4 z-50 bg-white rounded-xl shadow-lg border p-3 w-52">
      {/* Grid Style */}
      <div className="text-xs font-medium text-gray-500 mb-2">Grid</div>
      <div className="flex gap-1.5 mb-3">
        {GRID_STYLES.map((gs) => (
          <button
            key={gs.value}
            onClick={() => {
              onGridStyleChange(gs.value);
            }}
            className={clsx(
              "flex-1 text-xs py-1.5 rounded-md border transition-colors",
              gridStyle === gs.value
                ? "bg-blue-100 border-blue-400 text-blue-700"
                : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
            )}
          >
            {gs.label}
          </button>
        ))}
      </div>

      {/* Background Color */}
      <div className="text-xs font-medium text-gray-500 mb-2">Background</div>
      <div className="flex flex-wrap gap-1.5">
        {BG_COLORS.map((color) => (
          <button
            key={color}
            data-testid="bg-color-btn"
            onClick={() => {
              onBackgroundColorChange(color);
            }}
            className={clsx(
              "w-7 h-7 rounded-md border-2 transition-transform hover:scale-110",
              backgroundColor === color ? "border-blue-500 scale-110" : "border-gray-200"
            )}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
    </div>
  );
}
