import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BoardContext } from "../BoardContext";
import type { BoardContextValue } from "../BoardContext";

vi.mock("@clerk/nextjs", () => ({
  UserButton: () => <div data-testid="mock-user-button" />,
  ClerkProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useUser: vi.fn(() => ({ isLoaded: true, isSignedIn: true, user: { id: "test" } })),
  useAuth: vi.fn(() => ({ isLoaded: true, isSignedIn: true, userId: "test", getToken: vi.fn() })),
}));

import { MenuBar } from "../MenuBar";

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

function renderMenuBar(contextOverrides: Partial<BoardContextValue> = {}): BoardContextValue {
  const ctx = createMockContext(contextOverrides);
  render(
    <BoardContext.Provider value={ctx}>
      <MenuBar boardName="Test Board" onBoardNameChange={vi.fn()} />
    </BoardContext.Provider>
  );
  return ctx;
}

describe("MenuBar zoom range — AC4.1: minimum zoom is 0.02", () => {
  it("zoom out button does not clamp at 0.1 when current zoom is 0.05", () => {
    const ctx = renderMenuBar({ zoom: 0.05 });
    fireEvent.click(screen.getByLabelText("Zoom out"));
    const calledWith = (ctx.setZoom as ReturnType<typeof vi.fn>).mock.calls[0][0] as number;
    expect(calledWith).toBeLessThan(0.1);
  });

  it("zoom out button clamps at MIN_ZOOM=0.02", () => {
    const ctx = renderMenuBar({ zoom: 0.02 });
    fireEvent.click(screen.getByLabelText("Zoom out"));
    const calledWith = (ctx.setZoom as ReturnType<typeof vi.fn>).mock.calls[0][0] as number;
    expect(calledWith).toBeGreaterThanOrEqual(0.02);
  });
});

describe("MenuBar zoom range — AC4.2: maximum zoom is 20", () => {
  it("zoom in button does not clamp at 5 when current zoom is 10", () => {
    const ctx = renderMenuBar({ zoom: 10 });
    fireEvent.click(screen.getByLabelText("Zoom in"));
    const calledWith = (ctx.setZoom as ReturnType<typeof vi.fn>).mock.calls[0][0] as number;
    expect(calledWith).toBeGreaterThan(5);
  });

  it("zoom in button clamps at MAX_ZOOM=20", () => {
    const ctx = renderMenuBar({ zoom: 18 });
    fireEvent.click(screen.getByLabelText("Zoom in"));
    const calledWith = (ctx.setZoom as ReturnType<typeof vi.fn>).mock.calls[0][0] as number;
    expect(calledWith).toBeLessThanOrEqual(20);
  });
});

describe("MenuBar zoom range — AC4.3: View menu uses updated limits", () => {
  it("View menu Zoom In does not clamp at 5 when at zoom=10", () => {
    const ctx = renderMenuBar({ zoom: 10 });
    fireEvent.click(screen.getByText("View"));
    fireEvent.click(screen.getByText("Zoom In"));
    const calledWith = (ctx.setZoom as ReturnType<typeof vi.fn>).mock.calls[0][0] as number;
    expect(calledWith).toBeGreaterThan(5);
  });

  it("View menu Zoom Out does not clamp at 0.1 when at zoom=0.05", () => {
    const ctx = renderMenuBar({ zoom: 0.05 });
    fireEvent.click(screen.getByText("View"));
    fireEvent.click(screen.getByText("Zoom Out"));
    const calledWith = (ctx.setZoom as ReturnType<typeof vi.fn>).mock.calls[0][0] as number;
    expect(calledWith).toBeLessThan(0.1);
  });
});

describe("MenuBar zoom stepping — AC4.4: proportional stepping", () => {
  it("zoom out at zoom=1 uses proportional step (÷1.2)", () => {
    const ctx = renderMenuBar({ zoom: 1 });
    fireEvent.click(screen.getByLabelText("Zoom out"));
    const calledWith = (ctx.setZoom as ReturnType<typeof vi.fn>).mock.calls[0][0] as number;
    expect(calledWith).toBeCloseTo(1 / 1.2, 4);
  });

  it("zoom in at zoom=1 uses proportional step (×1.2)", () => {
    const ctx = renderMenuBar({ zoom: 1 });
    fireEvent.click(screen.getByLabelText("Zoom in"));
    const calledWith = (ctx.setZoom as ReturnType<typeof vi.fn>).mock.calls[0][0] as number;
    expect(calledWith).toBeCloseTo(1 * 1.2, 4);
  });

  it("zoom in at zoom=10 multiplies by 1.2", () => {
    const ctx = renderMenuBar({ zoom: 10 });
    fireEvent.click(screen.getByLabelText("Zoom in"));
    const calledWith = (ctx.setZoom as ReturnType<typeof vi.fn>).mock.calls[0][0] as number;
    expect(calledWith).toBeCloseTo(10 * 1.2, 4);
  });

  it("zoom display shows 5% at zoom=0.05", () => {
    renderMenuBar({ zoom: 0.05 });
    expect(screen.getByText("5%")).toBeInTheDocument();
  });

  it("zoom display shows 2000% at zoom=20", () => {
    renderMenuBar({ zoom: 20 });
    expect(screen.getByText("2000%")).toBeInTheDocument();
  });

  it("zoom display shows 100% at zoom=1", () => {
    renderMenuBar({ zoom: 1 });
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("zoom display shows 2% at MIN_ZOOM=0.02", () => {
    renderMenuBar({ zoom: 0.02 });
    expect(screen.getByText("2%")).toBeInTheDocument();
  });
});

describe("MenuBar zoom clamping — boundary arithmetic", () => {
  it("zoom in from MAX_ZOOM=20 stays clamped at 20", () => {
    const ctx = renderMenuBar({ zoom: 20 });
    fireEvent.click(screen.getByLabelText("Zoom in"));
    const calledWith = (ctx.setZoom as ReturnType<typeof vi.fn>).mock.calls[0][0] as number;
    expect(calledWith).toBe(20);
  });

  it("zoom out from MIN_ZOOM=0.02 stays clamped at 0.02", () => {
    const ctx = renderMenuBar({ zoom: 0.02 });
    fireEvent.click(screen.getByLabelText("Zoom out"));
    const calledWith = (ctx.setZoom as ReturnType<typeof vi.fn>).mock.calls[0][0] as number;
    expect(calledWith).toBe(0.02);
  });
});

describe("MenuBar board name input", () => {
  it("renders an input with the board name value", () => {
    renderMenuBar();
    const input = screen.getByDisplayValue("Test Board");
    expect(input).toBeInTheDocument();
  });

  it("calls onBoardNameChange when the user edits the name and blurs", () => {
    const onBoardNameChange = vi.fn();
    const ctx = createMockContext();
    render(
      <BoardContext.Provider value={ctx}>
        <MenuBar boardName="Old Name" onBoardNameChange={onBoardNameChange} />
      </BoardContext.Provider>
    );
    const input = screen.getByDisplayValue("Old Name");
    fireEvent.change(input, { target: { value: "New Name" } });
    fireEvent.blur(input);
    expect(onBoardNameChange).toHaveBeenCalledWith("New Name");
  });

  it("does NOT call onBoardNameChange when the name is unchanged on blur", () => {
    const onBoardNameChange = vi.fn();
    const ctx = createMockContext();
    render(
      <BoardContext.Provider value={ctx}>
        <MenuBar boardName="Unchanged" onBoardNameChange={onBoardNameChange} />
      </BoardContext.Provider>
    );
    const input = screen.getByDisplayValue("Unchanged");
    fireEvent.blur(input);
    expect(onBoardNameChange).not.toHaveBeenCalled();
  });

  it("does NOT call onBoardNameChange when the trimmed name is empty on blur", () => {
    const onBoardNameChange = vi.fn();
    const ctx = createMockContext();
    render(
      <BoardContext.Provider value={ctx}>
        <MenuBar boardName="Non-empty" onBoardNameChange={onBoardNameChange} />
      </BoardContext.Provider>
    );
    const input = screen.getByDisplayValue("Non-empty");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.blur(input);
    expect(onBoardNameChange).not.toHaveBeenCalled();
  });

  it("submits the name when Enter is pressed", () => {
    const onBoardNameChange = vi.fn();
    const ctx = createMockContext();
    render(
      <BoardContext.Provider value={ctx}>
        <MenuBar boardName="Old Name" onBoardNameChange={onBoardNameChange} />
      </BoardContext.Provider>
    );
    const input = screen.getByDisplayValue("Old Name");
    fireEvent.change(input, { target: { value: "Pressed Enter" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.blur(input);
    expect(onBoardNameChange).toHaveBeenCalledWith("Pressed Enter");
  });
});

describe("MenuBar share button", () => {
  it("renders a Share button", () => {
    renderMenuBar();
    expect(screen.getByText("Share")).toBeInTheDocument();
  });

  it("calls onShareClick when the Share button is clicked", () => {
    const onShareClick = vi.fn();
    const ctx = createMockContext();
    render(
      <BoardContext.Provider value={ctx}>
        <MenuBar boardName="Board" onBoardNameChange={vi.fn()} onShareClick={onShareClick} />
      </BoardContext.Provider>
    );
    fireEvent.click(screen.getByText("Share"));
    expect(onShareClick).toHaveBeenCalledOnce();
  });
});

describe("MenuBar Edit menu — undo/redo integration", () => {
  it("Undo menu item calls ctx.undo()", () => {
    const ctx = renderMenuBar({ canUndo: true });
    fireEvent.click(screen.getByText("Edit"));
    fireEvent.click(screen.getByText("Undo"));
    expect(ctx.undo).toHaveBeenCalled();
  });

  it("Redo menu item calls ctx.redo()", () => {
    const ctx = renderMenuBar({ canRedo: true });
    fireEvent.click(screen.getByText("Edit"));
    fireEvent.click(screen.getByText("Redo"));
    expect(ctx.redo).toHaveBeenCalled();
  });

  it("Undo menu item is disabled when canUndo=false", () => {
    renderMenuBar({ canUndo: false });
    fireEvent.click(screen.getByText("Edit"));
    const undoButton = screen.getByText("Undo").closest("button");
    expect(undoButton).toBeDisabled();
  });

  it("Redo menu item is disabled when canRedo=false", () => {
    renderMenuBar({ canRedo: false });
    fireEvent.click(screen.getByText("Edit"));
    const redoButton = screen.getByText("Redo").closest("button");
    expect(redoButton).toBeDisabled();
  });

  it("Delete Selected menu item calls ctx.deleteSelected()", () => {
    const ctx = renderMenuBar();
    fireEvent.click(screen.getByText("Edit"));
    fireEvent.click(screen.getByText("Delete Selected"));
    expect(ctx.deleteSelected).toHaveBeenCalled();
  });

  it("Copy menu item calls ctx.copySelected()", () => {
    const ctx = renderMenuBar();
    fireEvent.click(screen.getByText("Edit"));
    fireEvent.click(screen.getByText("Copy"));
    expect(ctx.copySelected).toHaveBeenCalled();
  });

  it("Paste menu item calls ctx.pasteFromClipboard()", () => {
    const ctx = renderMenuBar();
    fireEvent.click(screen.getByText("Edit"));
    fireEvent.click(screen.getByText("Paste"));
    expect(ctx.pasteFromClipboard).toHaveBeenCalled();
  });

  it("Duplicate menu item calls ctx.duplicateSelected()", () => {
    const ctx = renderMenuBar();
    fireEvent.click(screen.getByText("Edit"));
    fireEvent.click(screen.getByText("Duplicate"));
    expect(ctx.duplicateSelected).toHaveBeenCalled();
  });
});

describe("MenuBar View menu — Fit to Screen", () => {
  it("Fit to Screen calls ctx.fitToScreen()", () => {
    const ctx = renderMenuBar();
    fireEvent.click(screen.getByText("View"));
    fireEvent.click(screen.getByText("Fit to Screen"));
    expect(ctx.fitToScreen).toHaveBeenCalled();
  });

  it("Keyboard Shortcuts calls onShowShortcuts", () => {
    const onShowShortcuts = vi.fn();
    const ctx = createMockContext();
    render(
      <BoardContext.Provider value={ctx}>
        <MenuBar boardName="Board" onBoardNameChange={vi.fn()} onShowShortcuts={onShowShortcuts} />
      </BoardContext.Provider>
    );
    fireEvent.click(screen.getByText("View"));
    fireEvent.click(screen.getByText("Keyboard Shortcuts"));
    expect(onShowShortcuts).toHaveBeenCalled();
  });
});

describe("MenuBar menu toggle behaviour", () => {
  it("clicking a menu trigger opens its dropdown", () => {
    renderMenuBar();
    fireEvent.click(screen.getByText("File"));
    expect(screen.getByText("Export as PNG")).toBeInTheDocument();
  });

  it("clicking the same menu trigger again closes the dropdown", () => {
    renderMenuBar();
    fireEvent.click(screen.getByText("File"));
    fireEvent.click(screen.getByText("File"));
    expect(screen.queryByText("Export as PNG")).not.toBeInTheDocument();
  });

  it("opening a second menu closes the first", () => {
    renderMenuBar();
    fireEvent.click(screen.getByText("File"));
    expect(screen.getByText("Export as PNG")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Edit"));
    expect(screen.queryByText("Export as PNG")).not.toBeInTheDocument();
    expect(screen.getByText("Undo")).toBeInTheDocument();
  });
});
