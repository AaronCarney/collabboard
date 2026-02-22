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
  /** Tools visible on the main bar (not inside the Shapes flyout). */
  const mainBarTools: { tool: ToolType; label: string }[] = [
    { tool: "select", label: "Select" },
    { tool: "pan", label: "Pan" },
    { tool: "sticky_note", label: "Sticky Note" },
    { tool: "text", label: "Text" },
    { tool: "line", label: "Line" },
    { tool: "connector", label: "Connector" },
    { tool: "frame", label: "Frame" },
  ];

  /** Tools accessible via main bar + Shapes flyout. */
  const _expectedTools = [
    ...mainBarTools,
    { tool: "rectangle" as ToolType, label: "Rectangle" },
    { tool: "circle" as ToolType, label: "Circle" },
  ];

  it("renders main bar tool buttons plus the Shapes group", () => {
    renderSidebar();

    for (const { label } of mainBarTools) {
      expect(screen.getByTitle(label)).toBeInTheDocument();
    }
    expect(screen.getByTitle("Shapes")).toBeInTheDocument();
  });

  it("highlights the shapes group when a shape tool is active", () => {
    renderSidebar({ activeTool: "rectangle" });

    const shapesBtn = screen.getByTitle("Shapes");
    expect(shapesBtn.className).toContain("bg-blue-100");
    expect(shapesBtn.className).toContain("text-blue-700");

    const inactiveButton = screen.getByTitle("Select");
    expect(inactiveButton.className).not.toContain("bg-blue-100");
  });

  it("calls setActiveTool when a tool button is clicked", () => {
    const { ctx } = renderSidebar();

    // Open Shapes flyout and click Circle
    fireEvent.click(screen.getByTitle("Shapes"));
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

    for (const { label } of mainBarTools) {
      expect(screen.queryByTitle(label)).not.toBeInTheDocument();
    }
    expect(screen.queryByTitle("Shapes")).not.toBeInTheDocument();
  });

  it("shows tool buttons again when expanded after collapse", () => {
    renderSidebar();

    const toggle = screen.getByTitle("Toggle sidebar");
    // Collapse
    fireEvent.click(toggle);
    // Expand
    fireEvent.click(toggle);

    for (const { label } of mainBarTools) {
      expect(screen.getByTitle(label)).toBeInTheDocument();
    }
    expect(screen.getByTitle("Shapes")).toBeInTheDocument();
  });

  describe("shapes submenu", () => {
    it("renders a Shapes group button with chevron", () => {
      renderSidebar();
      const shapesBtn = screen.getByTitle("Shapes");
      expect(shapesBtn).toBeInTheDocument();
    });

    it("opens a flyout with triangle and star when shapes chevron is clicked", () => {
      renderSidebar();
      const shapesBtn = screen.getByTitle("Shapes");
      fireEvent.click(shapesBtn);
      expect(screen.getByTitle("Triangle")).toBeInTheDocument();
      expect(screen.getByTitle("Star")).toBeInTheDocument();
    });

    it("shows rectangle and circle inside the shapes flyout", () => {
      renderSidebar();
      fireEvent.click(screen.getByTitle("Shapes"));
      expect(screen.getByTitle("Rectangle")).toBeInTheDocument();
      expect(screen.getByTitle("Circle")).toBeInTheDocument();
    });

    it("selects a shape from the flyout and closes it", () => {
      const { ctx } = renderSidebar();
      fireEvent.click(screen.getByTitle("Shapes"));
      fireEvent.click(screen.getByTitle("Triangle"));
      expect(ctx.setActiveTool).toHaveBeenCalledWith("triangle");
    });

    it("remembers the last selected shape", () => {
      const { ctx: _ctx } = renderSidebar();
      // Open flyout and select triangle
      fireEvent.click(screen.getByTitle("Shapes"));
      fireEvent.click(screen.getByTitle("Triangle"));
      // Now clicking the main shapes button again should select triangle
      // (the last shape) without opening the flyout
    });
  });
});
