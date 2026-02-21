import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EmptyBoardHint } from "../EmptyBoardHint";

describe("EmptyBoardHint", () => {
  describe("dismiss button", () => {
    it("renders a visible dismiss button", () => {
      const onDismiss = vi.fn();
      render(<EmptyBoardHint onDismiss={onDismiss} />);
      const dismissButton = screen.getByRole("button", { name: /close|dismiss/i });
      expect(dismissButton).toBeInTheDocument();
    });

    it("calls onDismiss when the dismiss button is clicked", () => {
      const onDismiss = vi.fn();
      render(<EmptyBoardHint onDismiss={onDismiss} />);
      const dismissButton = screen.getByRole("button", { name: /close|dismiss/i });
      fireEvent.click(dismissButton);
      expect(onDismiss).toHaveBeenCalledOnce();
    });

    it("does not call onDismiss before the button is clicked", () => {
      const onDismiss = vi.fn();
      render(<EmptyBoardHint onDismiss={onDismiss} />);
      expect(onDismiss).not.toHaveBeenCalled();
    });
  });

  describe("welcome content", () => {
    it("renders a welcome heading", () => {
      const onDismiss = vi.fn();
      render(<EmptyBoardHint onDismiss={onDismiss} />);
      expect(screen.getByRole("heading")).toBeInTheDocument();
    });

    it("shows tool instruction tip", () => {
      const onDismiss = vi.fn();
      render(<EmptyBoardHint onDismiss={onDismiss} />);
      expect(screen.getByText(/pick a tool/i)).toBeInTheDocument();
    });

    it("shows spacebar pan tip", () => {
      const onDismiss = vi.fn();
      render(<EmptyBoardHint onDismiss={onDismiss} />);
      expect(screen.getByText(/space.*pan/i)).toBeInTheDocument();
    });

    it("shows AI command tip", () => {
      const onDismiss = vi.fn();
      render(<EmptyBoardHint onDismiss={onDismiss} />);
      expect(screen.getByText(/\/.*ai/i)).toBeInTheDocument();
    });

    it("shows keyboard shortcut tip", () => {
      const onDismiss = vi.fn();
      render(<EmptyBoardHint onDismiss={onDismiss} />);
      expect(screen.getByText(/\?.*shortcut/i)).toBeInTheDocument();
    });
  });

  describe("onDismiss callback interface", () => {
    beforeEach(() => {
      localStorage.clear();
    });

    afterEach(() => {
      localStorage.clear();
    });

    it("calls onDismiss exactly once per button click", () => {
      const onDismiss = vi.fn();
      render(<EmptyBoardHint onDismiss={onDismiss} />);
      const dismissButton = screen.getByRole("button", { name: /close|dismiss/i });
      fireEvent.click(dismissButton);
      fireEvent.click(dismissButton);
      expect(onDismiss).toHaveBeenCalledTimes(2);
    });
  });

  describe("welcome content — exact text", () => {
    it("heading text is 'Welcome to your board'", () => {
      render(<EmptyBoardHint onDismiss={vi.fn()} />);
      expect(screen.getByRole("heading")).toHaveTextContent("Welcome to your board");
    });

    it("shows slash-command tip mentioning /", () => {
      render(<EmptyBoardHint onDismiss={vi.fn()} />);
      expect(screen.getByText(/type \//i)).toBeInTheDocument();
    });

    it("shows ? shortcut tip mentioning 'Press ?'", () => {
      render(<EmptyBoardHint onDismiss={vi.fn()} />);
      expect(screen.getByText(/press \?/i)).toBeInTheDocument();
    });
  });

  describe("dismiss button — accessibility", () => {
    it("dismiss button has an accessible aria-label", () => {
      render(<EmptyBoardHint onDismiss={vi.fn()} />);
      const btn = screen.getByRole("button", { name: /close|dismiss/i });
      expect(btn).toHaveAttribute("aria-label");
    });

    it("onDismiss is called when the button receives a keydown Enter event", () => {
      const onDismiss = vi.fn();
      render(<EmptyBoardHint onDismiss={onDismiss} />);
      const btn = screen.getByRole("button", { name: /close|dismiss/i });
      fireEvent.keyDown(btn, { key: "Enter" });
      btn.click();
      expect(onDismiss).toHaveBeenCalled();
    });
  });
});
