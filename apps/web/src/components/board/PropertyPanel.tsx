"use client";

import { useState } from "react";
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

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64];
const FONT_FAMILIES = [
  { label: "Sans Serif", value: "sans-serif" },
  { label: "Serif", value: "serif" },
  { label: "Monospace", value: "monospace" },
];

function hasTextContent(obj: BoardObject): boolean {
  return obj.type === "text" || obj.type === "sticky_note";
}

const STROKE_WIDTHS = [1, 2, 3, 5, 8];

export function PropertyPanel({
  selectedObjects,
  onUpdateObjects,
}: PropertyPanelProps): React.JSX.Element {
  const ids = selectedObjects.map((o) => o.id);
  const colors = new Set(selectedObjects.map((o) => o.color));
  const currentColor = colors.size === 1 ? [...colors][0] : null;

  const [hexInput, setHexInput] = useState(currentColor ?? "");

  const showFontControls = selectedObjects.some(hasTextContent);

  const currentOpacity = selectedObjects.length === 1 ? (selectedObjects[0].opacity ?? 1) : null;

  const currentFontSize = selectedObjects.length === 1 ? (selectedObjects[0].fontSize ?? 16) : null;

  const currentFontFamily =
    selectedObjects.length === 1 ? (selectedObjects[0].fontFamily ?? "sans-serif") : null;

  return (
    <div className="absolute bottom-4 right-4 z-50 bg-white rounded-xl shadow-lg border p-3 w-56">
      {/* Drag Handle */}
      <div
        data-testid="property-panel-drag-handle"
        className="flex justify-center mb-2"
        style={{ cursor: "grab" }}
      >
        <div className="w-8 h-1 bg-gray-300 rounded-full" />
      </div>

      {/* Header */}
      <div className="text-xs font-medium text-gray-500 mb-2">
        {selectedObjects.length === 1
          ? "Properties"
          : `Properties (${String(selectedObjects.length)} objects)`}
      </div>

      {/* Color Swatches */}
      <div className="text-xs font-medium text-gray-500 mb-1">Color</div>
      <div className="flex flex-wrap gap-1.5 mb-3">
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
      {colors.size > 1 && <div className="text-xs text-gray-400 mb-2 italic">Mixed colors</div>}

      {/* Hex Color Input */}
      <input
        type="text"
        placeholder="#000000"
        value={hexInput}
        onChange={(e) => {
          setHexInput(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && /^#[0-9a-fA-F]{6}$/.test(hexInput)) {
            onUpdateObjects(ids, { color: hexInput });
          }
        }}
        className="w-full text-sm border rounded px-2 py-1 text-gray-700 mb-3"
      />

      {/* Stroke Section */}
      <div className="text-xs font-medium text-gray-500 mb-1">Stroke</div>
      <div className="flex flex-wrap gap-1.5 mb-3">
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
            aria-label={`Stroke color ${color}`}
          />
        ))}
      </div>

      {/* Stroke Width */}
      <div className="mb-3">
        <label
          htmlFor="stroke-width-select"
          className="text-xs font-medium text-gray-500 block mb-1"
        >
          Line Width
        </label>
        <select
          id="stroke-width-select"
          aria-label="Line Width"
          className="w-full text-sm border rounded px-2 py-1 text-gray-700"
        >
          {STROKE_WIDTHS.map((w) => (
            <option key={w} value={w}>
              {w}px
            </option>
          ))}
        </select>
      </div>

      {/* Opacity Slider */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="opacity-slider" className="text-xs font-medium text-gray-500">
            Opacity
          </label>
          <span className="text-xs text-gray-400">
            {currentOpacity !== null ? `${String(Math.round(currentOpacity * 100))}%` : "Mixed"}
          </span>
        </div>
        <input
          id="opacity-slider"
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={currentOpacity ?? 1}
          aria-label="Opacity"
          onChange={(e) => {
            onUpdateObjects(ids, { opacity: parseFloat(e.target.value) });
          }}
          className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* Font Controls (only for text/sticky_note) */}
      {showFontControls && (
        <>
          <div className="mb-2">
            <label
              htmlFor="font-size-select"
              className="text-xs font-medium text-gray-500 block mb-1"
            >
              Font Size
            </label>
            <select
              id="font-size-select"
              aria-label="Font Size"
              value={currentFontSize ?? 16}
              onChange={(e) => {
                onUpdateObjects(ids, { fontSize: parseInt(e.target.value, 10) });
              }}
              className="w-full text-sm border rounded px-2 py-1 text-gray-700"
            >
              {FONT_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}px
                </option>
              ))}
            </select>
          </div>

          <div className="mb-2">
            <label
              htmlFor="font-family-select"
              className="text-xs font-medium text-gray-500 block mb-1"
            >
              Font Family
            </label>
            <select
              id="font-family-select"
              aria-label="Font Family"
              value={currentFontFamily ?? "sans-serif"}
              onChange={(e) => {
                onUpdateObjects(ids, { fontFamily: e.target.value });
              }}
              className="w-full text-sm border rounded px-2 py-1 text-gray-700"
            >
              {FONT_FAMILIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </>
      )}
    </div>
  );
}
