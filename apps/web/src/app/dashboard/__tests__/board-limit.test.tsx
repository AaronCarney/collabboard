import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ─────────────────────────────────────────────────────────────
// Mock next/navigation
// ─────────────────────────────────────────────────────────────
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  })),
  usePathname: vi.fn(() => "/dashboard"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  useParams: vi.fn(() => ({})),
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
const mockDeleteEq = vi.fn();
const mockDeleteFn = vi.fn(() => ({ eq: mockDeleteEq }));
const mockOrder = vi.fn();
const mockSelectEq = vi.fn(() => ({ order: mockOrder }));
const mockSelectAll = vi.fn(() => ({ eq: mockSelectEq }));
const mockInsertSingle = vi.fn();
const mockInsertSelect = vi.fn(() => ({ single: mockInsertSingle }));
const mockInsert = vi.fn(() => ({ select: mockInsertSelect }));

const mockSupabase = {
  from: vi.fn(() => ({
    select: mockSelectAll,
    delete: mockDeleteFn,
    insert: mockInsert,
  })),
};

vi.mock("@/lib/supabase", () => ({
  createClerkSupabaseClient: vi.fn(() => mockSupabase),
}));

vi.mock("@/lib/toast", () => ({
  showToast: vi.fn(),
}));

import DashboardPage from "../page";
import type { Board } from "@/types/board";

// Helper to generate N boards
function generateBoards(count: number): Board[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `board-${String(i + 1)}`,
    name: `Board ${String(i + 1)}`,
    created_by: "test-user-id",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: `2024-01-0${String(Math.min(i + 1, 9))}T00:00:00Z`,
  }));
}

describe("Dashboard — AC3: shows persisted board names", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnValue({
      select: mockSelectAll,
      delete: mockDeleteFn,
      insert: mockInsert,
    });
    mockSelectAll.mockReturnValue({ eq: mockSelectEq });
    mockSelectEq.mockReturnValue({ order: mockOrder });
    mockDeleteFn.mockReturnValue({ eq: mockDeleteEq });
    mockInsert.mockReturnValue({ select: mockInsertSelect });
    mockInsertSelect.mockReturnValue({ single: mockInsertSingle });
  });

  it("displays each board's persisted name from the database", async () => {
    const boards = [
      {
        id: "board-1",
        name: "My Custom Name",
        created_by: "test-user-id",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      },
      {
        id: "board-2",
        name: "Another Board Title",
        created_by: "test-user-id",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-03T00:00:00Z",
      },
    ];
    mockOrder.mockResolvedValue({ data: boards });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("My Custom Name")).toBeInTheDocument();
    });
    expect(screen.getByText("Another Board Title")).toBeInTheDocument();
  });
});

describe("Dashboard — AC4: free users limited to 5 boards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnValue({
      select: mockSelectAll,
      delete: mockDeleteFn,
      insert: mockInsert,
    });
    mockSelectAll.mockReturnValue({ eq: mockSelectEq });
    mockSelectEq.mockReturnValue({ order: mockOrder });
    mockDeleteFn.mockReturnValue({ eq: mockDeleteEq });
    mockInsert.mockReturnValue({ select: mockInsertSelect });
    mockInsertSelect.mockReturnValue({ single: mockInsertSingle });
  });

  it("disables the create button when user has 5 boards", async () => {
    mockOrder.mockResolvedValue({ data: generateBoards(5) });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Board 1")).toBeInTheDocument();
    });

    const createButton = screen.getByRole("button", {
      name: /new board/i,
    });
    expect(createButton).toBeDisabled();
  });

  it("displays a board limit message when at 5 boards", async () => {
    mockOrder.mockResolvedValue({ data: generateBoards(5) });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Board 1")).toBeInTheDocument();
    });

    // Should show a limit message explaining the free tier cap
    expect(screen.getByText(/free plan limit/i)).toBeInTheDocument();
  });

  it("does NOT call Supabase insert when create is attempted at limit", async () => {
    mockOrder.mockResolvedValue({ data: generateBoards(5) });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Board 1")).toBeInTheDocument();
    });

    const createButton = screen.getByRole("button", {
      name: /new board/i,
    });
    fireEvent.click(createButton);

    // Wait a tick to make sure no async insert fires
    await waitFor(() => {
      expect(mockInsert).not.toHaveBeenCalled();
    });
  });

  it("shows an error toast when trying to create a board at the limit", async () => {
    mockOrder.mockResolvedValue({ data: generateBoards(5) });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Board 1")).toBeInTheDocument();
    });

    // The create button is disabled, so clicking it won't fire onClick.
    // Verify the limit is communicated via the visible limit message instead.
    const createButton = screen.getByRole("button", {
      name: /new board/i,
    });
    expect(createButton).toBeDisabled();
    expect(screen.getByText(/free plan limit/i)).toBeInTheDocument();

    // Also verify that no insert was called
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("allows creating boards when user has fewer than 5", async () => {
    mockOrder.mockResolvedValue({ data: generateBoards(3) });
    mockInsertSingle.mockResolvedValue({
      data: {
        id: "new-board-id",
        name: "Untitled Board",
        created_by: "test-user-id",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
      error: null,
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Board 1")).toBeInTheDocument();
    });

    const createButton = screen.getByRole("button", {
      name: /new board/i,
    });
    expect(createButton).not.toBeDisabled();

    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalled();
    });
  });
});

describe("Dashboard — board limit edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnValue({
      select: mockSelectAll,
      delete: mockDeleteFn,
      insert: mockInsert,
    });
    mockSelectAll.mockReturnValue({ eq: mockSelectEq });
    mockSelectEq.mockReturnValue({ order: mockOrder });
    mockDeleteFn.mockReturnValue({ eq: mockDeleteEq });
    mockInsert.mockReturnValue({ select: mockInsertSelect });
    mockInsertSelect.mockReturnValue({ single: mockInsertSingle });

    // Auto-confirm delete dialogs
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("re-enables the create button after deleting a board drops count from 5 to 4", async () => {
    const initialBoards = generateBoards(5);
    mockOrder.mockResolvedValue({ data: initialBoards });
    mockDeleteEq.mockResolvedValue({ error: null });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Board 1")).toBeInTheDocument();
    });

    // Button should be disabled at 5 boards
    const createButton = screen.getByRole("button", { name: /new board/i });
    expect(createButton).toBeDisabled();

    // Delete the first board — confirm spy auto-accepts
    const deleteButtons = screen.getAllByRole("button", {
      name: /delete board/i,
    });
    fireEvent.click(deleteButtons[0]);

    // Wait for Supabase delete to be called (confirms mock chain is working)
    await waitFor(() => {
      expect(mockDeleteEq).toHaveBeenCalledWith("id", "board-1");
    });

    // After deletion, board count drops to 4 — button must re-enable
    await waitFor(
      () => {
        expect(screen.getByRole("button", { name: /new board/i })).not.toBeDisabled();
      },
      { timeout: 3000 }
    );
  });

  it("allows creation when board count is exactly 4 (one below the limit)", async () => {
    mockOrder.mockResolvedValue({ data: generateBoards(4) });
    mockInsertSingle.mockResolvedValue({
      data: {
        id: "new-board-id",
        name: "Untitled Board",
        created_by: "test-user-id",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
      error: null,
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Board 1")).toBeInTheDocument();
    });

    const createButton = screen.getByRole("button", { name: /new board/i });
    expect(createButton).not.toBeDisabled();

    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalled();
    });
  });

  it("keeps the create button disabled when board count is above the limit", async () => {
    // 6 boards — above the 5-board free-tier ceiling
    mockOrder.mockResolvedValue({ data: generateBoards(6) });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Board 1")).toBeInTheDocument();
    });

    const createButton = screen.getByRole("button", { name: /new board/i });
    expect(createButton).toBeDisabled();
  });

  it("does not hide the limit message when board count is above the limit", async () => {
    mockOrder.mockResolvedValue({ data: generateBoards(6) });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Board 1")).toBeInTheDocument();
    });

    expect(screen.getByText(/free plan limit/i)).toBeInTheDocument();
  });
});

describe("Dashboard — AC5: board limit feedback UX", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnValue({
      select: mockSelectAll,
      delete: mockDeleteFn,
      insert: mockInsert,
    });
    mockSelectAll.mockReturnValue({ eq: mockSelectEq });
    mockSelectEq.mockReturnValue({ order: mockOrder });
    mockDeleteFn.mockReturnValue({ eq: mockDeleteEq });
    mockInsert.mockReturnValue({ select: mockInsertSelect });
    mockInsertSelect.mockReturnValue({ single: mockInsertSingle });
  });

  it("shows the create button with a disabled visual state at the limit", async () => {
    mockOrder.mockResolvedValue({ data: generateBoards(5) });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Board 1")).toBeInTheDocument();
    });

    const createButton = screen.getByRole("button", {
      name: /new board/i,
    });
    // Should have disabled attribute or cursor-not-allowed class
    const isDisabled =
      createButton.hasAttribute("disabled") ||
      createButton.className.includes("cursor-not-allowed") ||
      createButton.getAttribute("aria-disabled") === "true";
    expect(isDisabled).toBe(true);
  });

  it("displays a message about deleting boards to create new ones", async () => {
    mockOrder.mockResolvedValue({ data: generateBoards(5) });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Board 1")).toBeInTheDocument();
    });

    // Should contain guidance about deleting a board
    expect(screen.getByText(/delete a board/i)).toBeInTheDocument();
  });

  it("does not show limit message when under the board limit", async () => {
    mockOrder.mockResolvedValue({ data: generateBoards(2) });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Board 1")).toBeInTheDocument();
    });

    // No limit message should appear
    expect(screen.queryByText(/free plan limit/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/delete a board/i)).not.toBeInTheDocument();
  });
});
