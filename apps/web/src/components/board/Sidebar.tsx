"use client";

import { useState } from "react";
import { clsx } from "clsx";
import {
  MousePointer2,
  Hand,
  StickyNote,
  Square,
  Circle,
  Type,
  Minus,
  Cable,
  Frame,
  PanelLeftClose,
  PanelLeftOpen,
  Triangle,
  Star,
  ChevronDown,
} from "lucide-react";
import { useBoardContext } from "./BoardContext";
import type { ToolType } from "@collabboard/shared";

interface ToolDef {
  id: ToolType;
  label: string;
  icon: React.ReactNode;
}

const mainTools: ToolDef[] = [
  { id: "select", label: "Select", icon: <MousePointer2 size={18} /> },
  { id: "pan", label: "Pan", icon: <Hand size={18} /> },
  { id: "sticky_note", label: "Sticky Note", icon: <StickyNote size={18} /> },
];

const shapeTools: ToolDef[] = [
  { id: "rectangle", label: "Rectangle", icon: <Square size={18} /> },
  { id: "circle", label: "Circle", icon: <Circle size={18} /> },
  { id: "triangle", label: "Triangle", icon: <Triangle size={18} /> },
  { id: "star", label: "Star", icon: <Star size={18} /> },
];

const afterShapeTools: ToolDef[] = [
  { id: "text", label: "Text", icon: <Type size={18} /> },
  { id: "line", label: "Line", icon: <Minus size={18} /> },
  { id: "connector", label: "Connector", icon: <Cable size={18} /> },
  { id: "frame", label: "Frame", icon: <Frame size={18} /> },
];

const shapeIconMap: Record<string, React.ReactNode> = {
  rectangle: <Square size={18} />,
  circle: <Circle size={18} />,
  triangle: <Triangle size={18} />,
  star: <Star size={18} />,
};

const shapeIds = new Set(shapeTools.map((t) => t.id));

export function Sidebar(): React.JSX.Element {
  const { activeTool, setActiveTool } = useBoardContext();
  const [collapsed, setCollapsed] = useState(false);
  const [shapesOpen, setShapesOpen] = useState(false);
  const [lastShape, setLastShape] = useState<ToolType>("rectangle");

  const isShapeActive = shapeIds.has(activeTool);

  const handleShapeSelect = (toolId: ToolType): void => {
    setActiveTool(toolId);
    setLastShape(toolId);
    setShapesOpen(false);
  };

  return (
    <div
      className={clsx(
        "absolute left-2 top-1/2 -translate-y-1/2 z-50",
        "bg-white rounded-xl shadow-md border flex flex-col items-center gap-1 py-2",
        collapsed ? "px-1" : "px-1.5"
      )}
    >
      {!collapsed && (
        <>
          {/* Main tools before shapes group */}
          {mainTools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => {
                setActiveTool(tool.id);
              }}
              title={tool.label}
              className={clsx(
                "w-9 h-9 flex items-center justify-center rounded-lg transition",
                activeTool === tool.id
                  ? "bg-blue-100 text-blue-700"
                  : "hover:bg-gray-100 text-gray-600"
              )}
            >
              {tool.icon}
            </button>
          ))}

          {/* Shapes group button */}
          <div className="relative">
            <button
              onClick={() => {
                setShapesOpen((prev) => !prev);
              }}
              title="Shapes"
              className={clsx(
                "w-9 h-9 flex items-center justify-center rounded-lg transition relative",
                isShapeActive ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100 text-gray-600"
              )}
            >
              {shapeIconMap[lastShape] ?? <Square size={18} />}
              <ChevronDown size={8} className="absolute bottom-0.5 right-0.5" />
            </button>

            {/* Shapes flyout */}
            {shapesOpen && (
              <div className="absolute left-full top-0 ml-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 px-1 flex flex-col gap-0.5 z-50">
                {shapeTools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => {
                      handleShapeSelect(tool.id);
                    }}
                    title={tool.label}
                    className={clsx(
                      "w-9 h-9 flex items-center justify-center rounded-lg transition",
                      activeTool === tool.id
                        ? "bg-blue-100 text-blue-700"
                        : "hover:bg-gray-100 text-gray-600"
                    )}
                  >
                    {tool.icon}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tools after shapes group */}
          {afterShapeTools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => {
                setActiveTool(tool.id);
              }}
              title={tool.label}
              className={clsx(
                "w-9 h-9 flex items-center justify-center rounded-lg transition",
                activeTool === tool.id
                  ? "bg-blue-100 text-blue-700"
                  : "hover:bg-gray-100 text-gray-600"
              )}
            >
              {tool.icon}
            </button>
          ))}
        </>
      )}

      <div className={clsx(!collapsed && "w-7 h-px bg-gray-200 my-0.5")} />

      <button
        onClick={() => {
          setCollapsed((prev) => !prev);
        }}
        title="Toggle sidebar"
        className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition"
      >
        {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
      </button>
    </div>
  );
}
