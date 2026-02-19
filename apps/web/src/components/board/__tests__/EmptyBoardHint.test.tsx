import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyBoardHint } from "../EmptyBoardHint";

describe("EmptyBoardHint", () => {
  it("renders a heading", () => {
    render(<EmptyBoardHint />);
    expect(screen.getByRole("heading")).toBeInTheDocument();
  });

  it("shows tool instruction", () => {
    render(<EmptyBoardHint />);
    expect(screen.getByText(/pick a tool/i)).toBeInTheDocument();
  });

  it("shows spacebar pan hint", () => {
    render(<EmptyBoardHint />);
    expect(screen.getByText(/space.*pan/i)).toBeInTheDocument();
  });

  it("shows AI command hint", () => {
    render(<EmptyBoardHint />);
    expect(screen.getByText(/\/.*ai/i)).toBeInTheDocument();
  });

  it("shows keyboard shortcut hint", () => {
    render(<EmptyBoardHint />);
    expect(screen.getByText(/\?.*shortcut/i)).toBeInTheDocument();
  });
});
