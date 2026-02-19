import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { KeyboardHelpOverlay } from "../KeyboardHelpOverlay";

describe("KeyboardHelpOverlay", () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all shortcut categories when open", () => {
    render(<KeyboardHelpOverlay isOpen onClose={onClose} />);
    expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
    // Check for key shortcut descriptions
    expect(screen.getByText(/delete/i)).toBeInTheDocument();
    expect(screen.getByText(/undo/i)).toBeInTheDocument();
    expect(screen.getByText(/redo/i)).toBeInTheDocument();
    expect(screen.getByText(/select all/i)).toBeInTheDocument();
    expect(screen.getByText(/pan/i)).toBeInTheDocument();
    expect(screen.getByText(/copy/i)).toBeInTheDocument();
    expect(screen.getByText(/paste/i)).toBeInTheDocument();
    expect(screen.getByText(/duplicate/i)).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    const { container } = render(<KeyboardHelpOverlay isOpen={false} onClose={onClose} />);
    expect(container.firstElementChild).toBeNull();
  });

  it("calls onClose when close button is clicked", () => {
    render(<KeyboardHelpOverlay isOpen onClose={onClose} />);
    const closeButton = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when Escape is pressed", () => {
    render(<KeyboardHelpOverlay isOpen onClose={onClose} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
