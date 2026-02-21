import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ─────────────────────────────────────────────────────────────
// Mock next/navigation — override setup mock so we can track push calls
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
// Mock Clerk — must intercept @clerk/nextjs to prevent the
// @clerk/shared runtime ClerkProvider assertion
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
import { showToast } from "@/lib/toast";
import type { Board } from "@/types/board";

const mockBoards: Board[] = [
  {
    id: "board-1",
    name: "First Board",
    created_by: "test-user-id",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-02T00:00:00Z",
  },
  {
    id: "board-2",
    name: "Second Board",
    created_by: "test-user-id",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-03T00:00:00Z",
  },
];

describe("DashboardPage — delete board", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-wire chainable mock returns after clearAllMocks
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
    mockOrder.mockResolvedValue({ data: mockBoards });
    // Default: confirm returns true
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("renders a delete button on each board card", async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("First Board")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole("button", {
      name: /delete board/i,
    });
    expect(deleteButtons).toHaveLength(2);
  });

  it("shows confirmation dialog when delete button is clicked", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("First Board")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole("button", {
      name: /delete board/i,
    });
    fireEvent.click(deleteButtons[0]);

    expect(confirmSpy).toHaveBeenCalledWith("Delete this board? This cannot be undone.");
  });

  it("calls Supabase delete when confirmation is accepted", async () => {
    mockDeleteEq.mockResolvedValue({ error: null });
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("First Board")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole("button", {
      name: /delete board/i,
    });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockDeleteFn).toHaveBeenCalled();
      expect(mockDeleteEq).toHaveBeenCalledWith("id", "board-1");
    });
  });

  it("removes the board from the list after successful deletion", async () => {
    mockDeleteEq.mockResolvedValue({ error: null });
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("First Board")).toBeInTheDocument();
    });

    // After initial load, make subsequent loadBoards return only the second board
    // (simulating the server state after deletion)
    mockOrder.mockResolvedValue({ data: [mockBoards[1]] });

    const deleteButtons = screen.getAllByRole("button", {
      name: /delete board/i,
    });

    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith("Board deleted", "info");
    });

    await waitFor(() => {
      expect(screen.queryByText("First Board")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Second Board")).toBeInTheDocument();
  });

  it("does NOT delete when confirmation is cancelled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("First Board")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole("button", {
      name: /delete board/i,
    });
    fireEvent.click(deleteButtons[0]);

    expect(mockDeleteFn).not.toHaveBeenCalled();
    expect(screen.getByText("First Board")).toBeInTheDocument();
  });

  it("shows error toast when deletion fails", async () => {
    mockDeleteEq.mockResolvedValue({ error: { message: "RLS denied" } });
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("First Board")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole("button", {
      name: /delete board/i,
    });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith("Failed to delete board", "error");
    });
    // Board should still be in the list
    expect(screen.getByText("First Board")).toBeInTheDocument();
  });

  it("does not navigate when delete button is clicked", async () => {
    mockDeleteEq.mockResolvedValue({ error: null });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("First Board")).toBeInTheDocument();
    });

    mockPush.mockClear();

    const deleteButtons = screen.getAllByRole("button", {
      name: /delete board/i,
    });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockDeleteFn).toHaveBeenCalled();
    });

    // push should not have been called — stopPropagation prevents card navigation
    expect(mockPush).not.toHaveBeenCalled();
  });
});
