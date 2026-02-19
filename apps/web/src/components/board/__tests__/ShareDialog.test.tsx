import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ShareDialog } from "../ShareDialog";

// Mock clipboard
const mockWriteText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, "clipboard", {
  value: { writeText: mockWriteText },
  writable: true,
  configurable: true,
});

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("ShareDialog", () => {
  const defaultProps = {
    boardId: "22222222-2222-2222-2222-222222222222",
    isOpen: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "11111111-1111-1111-1111-111111111111",
          board_id: "22222222-2222-2222-2222-222222222222",
          access_level: "view",
          token: "33333333-3333-3333-3333-333333333333",
          created_by: "user-1",
          created_at: "2026-01-01T00:00:00Z",
          expires_at: null,
        }),
    });
  });

  it("renders dialog when open", () => {
    render(<ShareDialog {...defaultProps} />);
    expect(screen.getByText("Share Board")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<ShareDialog {...defaultProps} isOpen={false} />);
    expect(screen.queryByText("Share Board")).not.toBeInTheDocument();
  });

  it("shows access level toggle with view and edit options", () => {
    render(<ShareDialog {...defaultProps} />);
    expect(screen.getByText("Can view")).toBeInTheDocument();
    expect(screen.getByText("Can edit")).toBeInTheDocument();
  });

  it("generates a share link when clicking generate button", async () => {
    render(<ShareDialog {...defaultProps} />);

    const generateBtn = screen.getByText("Generate Link");
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/share",
        expect.objectContaining({
          method: "POST",
          body: expect.any(String),
        })
      );
    });
  });

  it("copies link to clipboard when copy button is clicked", async () => {
    render(<ShareDialog {...defaultProps} />);

    // Generate link first
    fireEvent.click(screen.getByText("Generate Link"));

    await waitFor(() => {
      expect(screen.getByText("Copy Link")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Copy Link"));

    expect(mockWriteText).toHaveBeenCalledWith(
      expect.stringContaining("33333333-3333-3333-3333-333333333333")
    );
  });

  it("calls onClose when close button is clicked", () => {
    render(<ShareDialog {...defaultProps} />);
    fireEvent.click(screen.getByTitle("Close"));
    expect(defaultProps.onClose).toHaveBeenCalledOnce();
  });

  it("switches access level when edit is selected", () => {
    render(<ShareDialog {...defaultProps} />);

    const editBtn = screen.getByText("Can edit");
    fireEvent.click(editBtn);

    // Edit button should be highlighted
    expect(editBtn.className).toContain("bg-blue");
  });
});
