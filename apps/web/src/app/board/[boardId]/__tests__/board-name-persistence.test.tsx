import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";

// ─────────────────────────────────────────────────────────────
// Mock next/navigation — track push/replace for redirect tests
// ─────────────────────────────────────────────────────────────
const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
    replace: mockReplace,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  })),
  usePathname: vi.fn(() => "/board/test-board-id"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  useParams: vi.fn(() => ({ boardId: "test-board-id" })),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

// ─────────────────────────────────────────────────────────────
// Mock Clerk
// ─────────────────────────────────────────────────────────────
vi.mock("@clerk/nextjs", () => ({
  useUser: vi.fn(() => ({
    isLoaded: true,
    isSignedIn: true,
    user: {
      id: "test-user-id",
      fullName: "Test User",
      username: "testuser",
    },
  })),
  useAuth: vi.fn(() => ({
    isLoaded: true,
    isSignedIn: true,
    userId: "test-user-id",
    getToken: vi.fn().mockResolvedValue("mock-jwt-token"),
  })),
  UserButton: () => <div data-testid="mock-user-button" />,
  ClerkProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ─────────────────────────────────────────────────────────────
// Mock Supabase client with chainable API
// ─────────────────────────────────────────────────────────────
const mockUpdateThen = vi.fn();
const mockUpdateEq = vi.fn(() => ({ then: mockUpdateThen }));
const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }));
const mockSelectSingle = vi.fn();
const mockSelectEq = vi.fn(() => ({ single: mockSelectSingle }));
const mockSelectAll = vi.fn(() => ({ eq: mockSelectEq }));

const mockSupabase = {
  from: vi.fn(() => ({
    select: mockSelectAll,
    update: mockUpdate,
  })),
};

vi.mock("@/lib/supabase", () => ({
  createClerkSupabaseClient: vi.fn(() => mockSupabase),
  createRealtimeClient: vi.fn(() => mockSupabase),
}));

// ─────────────────────────────────────────────────────────────
// Mock toast
// ─────────────────────────────────────────────────────────────
vi.mock("@/lib/toast", () => ({
  showToast: vi.fn(),
}));

// ─────────────────────────────────────────────────────────────
// Mock board-store — the store is heavy; we only need a minimal stub
// ─────────────────────────────────────────────────────────────
const mockLoadObjects = vi.fn();
const mockSubscribe = vi.fn(() => vi.fn());

vi.mock("@/lib/board-store", () => ({
  useBoardStore: vi.fn(() => ({
    objects: [],
    selectedIds: [],
    editingId: null,
    activeTool: "select",
    camera: { x: 0, y: 0, zoom: 1 },
    presenceUsers: [],
    cursors: [],
    canUndo: false,
    canRedo: false,
    history: { execute: vi.fn() },
    loadObjects: mockLoadObjects,
    subscribe: mockSubscribe,
    setActiveTool: vi.fn(),
    setSelectedIds: vi.fn(),
    setEditingId: vi.fn(),
    moveObjects: vi.fn(),
    createObject: vi.fn(),
    deleteObject: vi.fn(),
    updateObject: vi.fn(),
    mergeObjects: vi.fn(),
    broadcastCursor: vi.fn(),
    setCamera: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    getPipeline: vi.fn(() => ({
      execute: vi.fn(),
      getObjects: vi.fn(() => []),
    })),
  })),
}));

// ─────────────────────────────────────────────────────────────
// Mock child components that are irrelevant to name persistence
// ─────────────────────────────────────────────────────────────
vi.mock("@/components/board/BoardCanvas", () => ({
  BoardCanvas: () => <div data-testid="mock-canvas" />,
}));
vi.mock("@/components/board/Sidebar", () => ({
  Sidebar: () => <div data-testid="mock-sidebar" />,
}));
vi.mock("@/components/board/MenuBar", () => ({
  MenuBar: ({
    boardName,
    onBoardNameChange,
  }: {
    boardName: string;
    onBoardNameChange: (name: string) => void;
  }) => (
    <div data-testid="mock-menubar">
      <span data-testid="board-name-display">{boardName}</span>
      <button
        data-testid="board-name-save"
        onClick={() => {
          onBoardNameChange("New Board Name");
        }}
      >
        Save
      </button>
      <button
        data-testid="board-name-save-custom"
        onClick={() => {
          // For tests that need custom names, we use a data attribute
          const customName = document.getElementById(
            "custom-name-input"
          ) as HTMLInputElement | null;
          onBoardNameChange(customName?.value ?? "");
        }}
      >
        Save Custom
      </button>
    </div>
  ),
}));
vi.mock("@/components/board/AiCommandBar", () => ({
  AiCommandBar: () => <div data-testid="mock-ai-bar" />,
}));
vi.mock("@/components/board/PresenceBar", () => ({
  PresenceBar: () => <div data-testid="mock-presence" />,
}));
vi.mock("@/components/board/TextEditor", () => ({
  TextEditor: () => <div data-testid="mock-text-editor" />,
}));
vi.mock("@/components/board/PropertyPanel", () => ({
  PropertyPanel: () => <div data-testid="mock-property-panel" />,
}));
vi.mock("@/components/board/ShareDialog", () => ({
  ShareDialog: () => <div data-testid="mock-share-dialog" />,
}));
vi.mock("@/components/board/EmptyBoardHint", () => ({
  EmptyBoardHint: () => <div data-testid="mock-hint" />,
}));
vi.mock("@/components/board/KeyboardHelpOverlay", () => ({
  KeyboardHelpOverlay: () => <div data-testid="mock-help" />,
}));
vi.mock("@/components/board/BoardContext", () => ({
  BoardContext: {
    Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  },
}));
vi.mock("@/hooks/useUndoRedoKeyboard", () => ({
  useUndoRedoKeyboard: vi.fn(),
}));
vi.mock("@/lib/board-keyboard", () => ({
  createBoardKeyHandler: vi.fn(() => vi.fn()),
  isTextInputFocused: vi.fn(() => false),
}));
vi.mock("@/lib/transforms", () => ({
  serializeObjectsToClipboard: vi.fn(() => ""),
  deserializeClipboard: vi.fn(() => []),
  createDuplicates: vi.fn(() => []),
  createPasteCommand: vi.fn(),
  createDuplicateCommand: vi.fn(),
}));

import { showToast } from "@/lib/toast";
import BoardPage from "../page";

function setupMocks(): void {
  mockSupabase.from.mockReturnValue({
    select: mockSelectAll,
    update: mockUpdate,
  });
  mockSelectAll.mockReturnValue({ eq: mockSelectEq });
  mockSelectEq.mockReturnValue({ single: mockSelectSingle });
  mockUpdate.mockReturnValue({ eq: mockUpdateEq });
  mockUpdateEq.mockReturnValue({ then: mockUpdateThen });
  mockUpdateThen.mockImplementation((cb: (result: { error: unknown }) => void) => {
    cb({ error: null });
    return { catch: vi.fn() };
  });

  mockSelectSingle.mockResolvedValue({
    data: {
      id: "test-board-id",
      name: "My Persisted Board",
      created_by: "test-user-id",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-02T00:00:00Z",
    },
    error: null,
  });

  mockSubscribe.mockReturnValue(vi.fn());
}

describe("Board name persistence — AC1: saves to database on blur", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it("calls Supabase update on boards table when board name changes", async () => {
    render(<BoardPage />);

    await waitFor(() => {
      expect(screen.getByTestId("board-name-save")).toBeInTheDocument();
    });

    // Simulate MenuBar blur/Enter firing onBoardNameChange
    act(() => {
      fireEvent.click(screen.getByTestId("board-name-save"));
    });

    // The board page should call supabase.from("boards").update({name: ...}).eq("id", boardId)
    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith("boards");
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ name: "New Board Name" }));
      expect(mockUpdateEq).toHaveBeenCalledWith("id", "test-board-id");
    });
  });

  it("does NOT include updated_at in update payload (DB trigger handles it)", async () => {
    render(<BoardPage />);

    await waitFor(() => {
      expect(screen.getByTestId("board-name-save")).toBeInTheDocument();
    });

    act(() => {
      fireEvent.click(screen.getByTestId("board-name-save"));
    });

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
    });

    // updated_at should NOT be in the payload — the DB trigger sets it
    const updateArg = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updateArg).not.toHaveProperty("updated_at");
  });

  it("saves immediately on each blur (no debounce needed)", async () => {
    render(<BoardPage />);

    await waitFor(() => {
      expect(screen.getByTestId("board-name-save")).toBeInTheDocument();
    });

    // First save
    act(() => {
      fireEvent.click(screen.getByTestId("board-name-save"));
    });

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledTimes(1);
    });

    // Second save (simulating another blur)
    act(() => {
      fireEvent.click(screen.getByTestId("board-name-save"));
    });

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledTimes(2);
    });
  });
});

describe("Board name persistence — edge cases: validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it("does NOT call Supabase update when the name is empty string", async () => {
    render(
      <>
        <input id="custom-name-input" defaultValue="" />
        <BoardPage />
      </>
    );

    await waitFor(() => {
      expect(screen.getByTestId("board-name-save-custom")).toBeInTheDocument();
    });

    act(() => {
      fireEvent.click(screen.getByTestId("board-name-save-custom"));
    });

    // update should not have been called with a name field
    const updateCalls = mockUpdate.mock.calls;
    const boardUpdateCalls = updateCalls.filter(
      (call: unknown[]) =>
        call[0] && typeof call[0] === "object" && "name" in (call[0] as Record<string, unknown>)
    );
    expect(boardUpdateCalls).toHaveLength(0);
  });

  it("does NOT call Supabase update when the name is whitespace-only", async () => {
    render(
      <>
        <input id="custom-name-input" defaultValue="   " />
        <BoardPage />
      </>
    );

    await waitFor(() => {
      expect(screen.getByTestId("board-name-save-custom")).toBeInTheDocument();
    });

    act(() => {
      fireEvent.click(screen.getByTestId("board-name-save-custom"));
    });

    const updateCalls = mockUpdate.mock.calls;
    const boardUpdateCalls = updateCalls.filter(
      (call: unknown[]) =>
        call[0] && typeof call[0] === "object" && "name" in (call[0] as Record<string, unknown>)
    );
    expect(boardUpdateCalls).toHaveLength(0);
  });

  it("truncates names longer than 100 characters before writing to DB", async () => {
    const longName = "A".repeat(150);
    render(
      <>
        <input id="custom-name-input" defaultValue={longName} />
        <BoardPage />
      </>
    );

    await waitFor(() => {
      expect(screen.getByTestId("board-name-save-custom")).toBeInTheDocument();
    });

    act(() => {
      fireEvent.click(screen.getByTestId("board-name-save-custom"));
    });

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ name: "A".repeat(100) }));
    });
  });

  it("strips control characters from the name before saving", async () => {
    render(
      <>
        <input id="custom-name-input" defaultValue={"Hello\x00World\nTest"} />
        <BoardPage />
      </>
    );

    await waitFor(() => {
      expect(screen.getByTestId("board-name-save-custom")).toBeInTheDocument();
    });

    act(() => {
      fireEvent.click(screen.getByTestId("board-name-save-custom"));
    });

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ name: "HelloWorldTest" }));
    });
  });

  it("shows error toast when Supabase update fails", async () => {
    mockUpdateThen.mockImplementation((cb: (result: { error: unknown }) => void) => {
      cb({ error: { message: "RLS violation" } });
      return { catch: vi.fn() };
    });

    render(<BoardPage />);

    await waitFor(() => {
      expect(screen.getByTestId("board-name-save")).toBeInTheDocument();
    });

    act(() => {
      fireEvent.click(screen.getByTestId("board-name-save"));
    });

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith("Failed to save board name", "error");
    });
  });
});

describe("Board name persistence — AC2: loads from database on mount", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase.from.mockReturnValue({
      select: mockSelectAll,
      update: mockUpdate,
    });
    mockSelectAll.mockReturnValue({ eq: mockSelectEq });
    mockSelectEq.mockReturnValue({ single: mockSelectSingle });
    mockUpdate.mockReturnValue({ eq: mockUpdateEq });
    mockUpdateEq.mockReturnValue({ then: mockUpdateThen });

    mockSubscribe.mockReturnValue(vi.fn());
  });

  it("fetches the board record from Supabase on mount and sets the name", async () => {
    mockSelectSingle.mockResolvedValue({
      data: {
        id: "test-board-id",
        name: "My Saved Board",
        created_by: "test-user-id",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      },
      error: null,
    });

    render(<BoardPage />);

    await waitFor(() => {
      expect(screen.getByTestId("board-name-display")).toHaveTextContent("My Saved Board");
    });

    expect(mockSupabase.from).toHaveBeenCalledWith("boards");
    expect(mockSelectAll).toHaveBeenCalledWith("name");
    expect(mockSelectEq).toHaveBeenCalledWith("id", "test-board-id");
  });

  it("sets document title to the loaded board name", async () => {
    mockSelectSingle.mockResolvedValue({
      data: {
        id: "test-board-id",
        name: "My Project Board",
        created_by: "test-user-id",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      },
      error: null,
    });

    render(<BoardPage />);

    await waitFor(() => {
      expect(document.title).toBe("My Project Board | CollabBoard");
    });
  });

  it("redirects to /dashboard with error toast when board is not found", async () => {
    mockSelectSingle.mockResolvedValue({
      data: null,
      error: { message: "Not found" },
    });

    render(<BoardPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });

    expect(showToast).toHaveBeenCalledWith(expect.stringContaining("not found"), "error");
  });

  it("redirects to /dashboard when board data is null (deleted board)", async () => {
    mockSelectSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    render(<BoardPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });
});
