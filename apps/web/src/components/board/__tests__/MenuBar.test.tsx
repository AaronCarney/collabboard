import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BoardContext } from "../BoardContext";
import type { BoardContextValue } from "../BoardContext";

// Ensure Clerk mock is active before MenuBar import
vi.mock("@clerk/nextjs", () => ({
  UserButton: () => <div data-testid="mock-user-button" />,
  ClerkProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useUser: vi.fn(() => ({ isLoaded: true, isSignedIn: true, user: { id: "test" } })),
  useAuth: vi.fn(() => ({ isLoaded: true, isSignedIn: true, userId: "test", getToken: vi.fn() })),
}));

// Import after mock declaration (vi.mock is hoisted automatically)
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
    gridVisible: true,
    toggleGrid: vi.fn(),
    readOnly: false,
    ...overrides,
  };
}

function renderWithContext(ui: React.ReactElement, contextValue: BoardContextValue) {
  return render(<BoardContext.Provider value={contextValue}>{ui}</BoardContext.Provider>);
}

describe("MenuBar", () => {
  let ctx: BoardContextValue;

  beforeEach(() => {
    ctx = createMockContext();
  });

  it("renders the board name", () => {
    renderWithContext(<MenuBar boardName="My Board" onBoardNameChange={vi.fn()} />, ctx);
    expect(screen.getByDisplayValue("My Board")).toBeInTheDocument();
  });

  it("calls onBoardNameChange when board name is edited", () => {
    const onBoardNameChange = vi.fn();
    renderWithContext(<MenuBar boardName="My Board" onBoardNameChange={onBoardNameChange} />, ctx);
    const input = screen.getByDisplayValue("My Board");
    fireEvent.change(input, { target: { value: "New Name" } });
    fireEvent.blur(input);
    expect(onBoardNameChange).toHaveBeenCalledWith("New Name");
  });

  it("renders File, Edit, and View menu triggers", () => {
    renderWithContext(<MenuBar boardName="Test" onBoardNameChange={vi.fn()} />, ctx);
    expect(screen.getByText("File")).toBeInTheDocument();
    expect(screen.getByText("Edit")).toBeInTheDocument();
    expect(screen.getByText("View")).toBeInTheDocument();
  });

  it("opens File menu and shows menu items on click", () => {
    renderWithContext(<MenuBar boardName="Test" onBoardNameChange={vi.fn()} />, ctx);
    fireEvent.click(screen.getByText("File"));
    expect(screen.getByText("New Board")).toBeInTheDocument();
    expect(screen.getByText("Duplicate Board")).toBeInTheDocument();
    expect(screen.getByText("Export as PNG")).toBeInTheDocument();
  });

  it("opens Edit menu and shows menu items with keyboard shortcuts", () => {
    renderWithContext(<MenuBar boardName="Test" onBoardNameChange={vi.fn()} />, ctx);
    fireEvent.click(screen.getByText("Edit"));
    expect(screen.getByText("Undo")).toBeInTheDocument();
    expect(screen.getByText("Redo")).toBeInTheDocument();
    expect(screen.getByText("Select All")).toBeInTheDocument();
    expect(screen.getByText("Delete Selected")).toBeInTheDocument();
    expect(screen.getByText("Copy")).toBeInTheDocument();
    expect(screen.getByText("Paste")).toBeInTheDocument();
    expect(screen.getByText("Duplicate")).toBeInTheDocument();
  });

  it("displays keyboard shortcut hints in Edit menu", () => {
    renderWithContext(<MenuBar boardName="Test" onBoardNameChange={vi.fn()} />, ctx);
    fireEvent.click(screen.getByText("Edit"));
    expect(screen.getByText("Ctrl+Z")).toBeInTheDocument();
    expect(screen.getByText("Ctrl+Shift+Z")).toBeInTheDocument();
    expect(screen.getByText("Ctrl+A")).toBeInTheDocument();
  });

  it("renders Undo and Redo as disabled when canUndo/canRedo are false", () => {
    ctx = createMockContext({ canUndo: false, canRedo: false });
    renderWithContext(<MenuBar boardName="Test" onBoardNameChange={vi.fn()} />, ctx);
    fireEvent.click(screen.getByText("Edit"));
    const undoItem = screen.getByText("Undo").closest("button");
    const redoItem = screen.getByText("Redo").closest("button");
    expect(undoItem).toBeDisabled();
    expect(redoItem).toBeDisabled();
  });

  it("renders Undo and Redo as enabled when canUndo/canRedo are true", () => {
    ctx = createMockContext({ canUndo: true, canRedo: true });
    renderWithContext(<MenuBar boardName="Test" onBoardNameChange={vi.fn()} />, ctx);
    fireEvent.click(screen.getByText("Edit"));
    const undoItem = screen.getByText("Undo").closest("button");
    const redoItem = screen.getByText("Redo").closest("button");
    expect(undoItem).not.toBeDisabled();
    expect(redoItem).not.toBeDisabled();
  });

  it("opens View menu and shows menu items", () => {
    renderWithContext(<MenuBar boardName="Test" onBoardNameChange={vi.fn()} />, ctx);
    fireEvent.click(screen.getByText("View"));
    expect(screen.getByText("Zoom In")).toBeInTheDocument();
    expect(screen.getByText("Zoom Out")).toBeInTheDocument();
    expect(screen.getByText("Fit to Screen")).toBeInTheDocument();
    expect(screen.getByText("Hide Grid")).toBeInTheDocument();
  });

  it("renders Share button", () => {
    renderWithContext(<MenuBar boardName="Test" onBoardNameChange={vi.fn()} />, ctx);
    expect(screen.getByText("Share")).toBeInTheDocument();
  });

  it("renders zoom percentage display with +/- controls", () => {
    ctx = createMockContext({ zoom: 1.5 });
    renderWithContext(<MenuBar boardName="Test" onBoardNameChange={vi.fn()} />, ctx);
    expect(screen.getByText("150%")).toBeInTheDocument();
    expect(screen.getByLabelText("Zoom in")).toBeInTheDocument();
    expect(screen.getByLabelText("Zoom out")).toBeInTheDocument();
  });

  it("calls setZoom when zoom +/- buttons are clicked", () => {
    ctx = createMockContext({ zoom: 1 });
    renderWithContext(<MenuBar boardName="Test" onBoardNameChange={vi.fn()} />, ctx);
    fireEvent.click(screen.getByLabelText("Zoom in"));
    expect(ctx.setZoom).toHaveBeenCalledWith(1 * 1.2);
    fireEvent.click(screen.getByLabelText("Zoom out"));
    expect(ctx.setZoom).toHaveBeenCalledWith(1 / 1.2);
  });

  it("renders the Clerk UserButton", () => {
    renderWithContext(<MenuBar boardName="Test" onBoardNameChange={vi.fn()} />, ctx);
    expect(screen.getByTestId("mock-user-button")).toBeInTheDocument();
  });

  it("closes menu when clicking outside", () => {
    renderWithContext(<MenuBar boardName="Test" onBoardNameChange={vi.fn()} />, ctx);
    fireEvent.click(screen.getByText("File"));
    expect(screen.getByText("New Board")).toBeInTheDocument();
    // Click outside the menu
    fireEvent.click(document.body);
    expect(screen.queryByText("New Board")).not.toBeInTheDocument();
  });
});
