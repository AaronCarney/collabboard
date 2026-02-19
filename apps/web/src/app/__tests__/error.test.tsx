import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import ErrorPage from "../error";
import GlobalErrorPage from "../global-error";

describe("Error boundary (app)", () => {
  const mockError = Object.assign(new globalThis.Error("Test error message"), { digest: "abc123" });
  const mockReset = vi.fn();

  it('renders "Something went wrong" heading', () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders try again button that calls reset", () => {
    render(<ErrorPage error={mockError} reset={mockReset} />);
    const button = screen.getByRole("button", { name: /try again/i });
    fireEvent.click(button);
    expect(mockReset).toHaveBeenCalled();
  });
});

describe("GlobalError boundary", () => {
  const mockError = Object.assign(new globalThis.Error("Global error"), { digest: "xyz789" });
  const mockReset = vi.fn();

  it('renders "Something went wrong" heading', () => {
    render(<GlobalErrorPage error={mockError} reset={mockReset} />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders try again button that calls reset", () => {
    render(<GlobalErrorPage error={mockError} reset={mockReset} />);
    const button = screen.getByRole("button", { name: /try again/i });
    fireEvent.click(button);
    expect(mockReset).toHaveBeenCalled();
  });
});
