import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Sidebar } from "../Sidebar";
import { BoardContext } from "../BoardContext";
import type { BoardContextValue } from "../BoardContext";
import type { ToolType } from "@collabboard/shared";

function createMockContext(overrides: Partial<BoardContextValue> = {}): BoardContextValue {
  return {
    activeTool: "select",
    setActiveTool: vi.fn(),
    selectedIds: new Set<string>(),
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: false,
    canRedo: false,
    zoom: 1,
    setZoom: vi.fn(),
    fitToScreen: vi.fn(),
    deleteSelected: vi.fn(),
    duplicateSelected: vi.fn(),
    copySelected: vi.fn(),
    pasteFromClipboard: vi.fn(),
    ...overrides,
  };
}

function renderSidebar(contextOverrides: Partial<BoardContextValue> = {}) {
  const ctx = createMockContext(contextOverrides);
  const result = render(
    <BoardContext.Provider value={ctx}>
      <Sidebar />
    </BoardContext.Provider>
  );
  return { ...result, ctx };
}

describe("Sidebar", () => {
  const expectedTools: { tool: ToolType; label: string }[] = [
    { tool: "select", label: "Select" },
    { tool: "pan", label: "Pan" },
    { tool: "sticky_note", label: "Sticky Note" },
    { tool: "rectangle", label: "Rectangle" },
    { tool: "circle", label: "Circle" },
    { tool: "text", label: "Text" },
    { tool: "line", label: "Line" },
    { tool: "connector", label: "Connector" },
    { tool: "frame", label: "Frame" },
  ];

  it("renders all tool buttons", () => {
    renderSidebar();

    for (const { label } of expectedTools) {
      expect(screen.getByTitle(label)).toBeInTheDocument();
    }
  });

  it("highlights the active tool", () => {
    renderSidebar({ activeTool: "rectangle" });

    const activeButton = screen.getByTitle("Rectangle");
    expect(activeButton.className).toContain("bg-blue-100");
    expect(activeButton.className).toContain("text-blue-700");

    const inactiveButton = screen.getByTitle("Select");
    expect(inactiveButton.className).not.toContain("bg-blue-100");
  });

  it("calls setActiveTool when a tool button is clicked", () => {
    const { ctx } = renderSidebar();

    fireEvent.click(screen.getByTitle("Circle"));
    expect(ctx.setActiveTool).toHaveBeenCalledWith("circle");

    fireEvent.click(screen.getByTitle("Line"));
    expect(ctx.setActiveTool).toHaveBeenCalledWith("line");
  });

  it("renders a collapse toggle button", () => {
    renderSidebar();

    const toggle = screen.getByTitle("Toggle sidebar");
    expect(toggle).toBeInTheDocument();
  });

  it("hides tool buttons when collapsed", () => {
    renderSidebar();

    const toggle = screen.getByTitle("Toggle sidebar");
    fireEvent.click(toggle);

    for (const { label } of expectedTools) {
      expect(screen.queryByTitle(label)).not.toBeInTheDocument();
    }
  });

  it("shows tool buttons again when expanded after collapse", () => {
    renderSidebar();

    const toggle = screen.getByTitle("Toggle sidebar");
    // Collapse
    fireEvent.click(toggle);
    // Expand
    fireEvent.click(toggle);

    for (const { label } of expectedTools) {
      expect(screen.getByTitle(label)).toBeInTheDocument();
    }
  });
});
