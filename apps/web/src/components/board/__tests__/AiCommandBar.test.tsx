import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AiCommandBar } from "../AiCommandBar";

describe("AiCommandBar", () => {
  it("renders the command input with placeholder", () => {
    render(<AiCommandBar onSubmit={vi.fn()} isLoading={false} />);
    expect(screen.getByPlaceholderText("Type / for AI commands...")).toBeInTheDocument();
  });

  it("calls onSubmit with input value when Enter is pressed", () => {
    const onSubmit = vi.fn();
    render(<AiCommandBar onSubmit={onSubmit} isLoading={false} />);
    const input = screen.getByPlaceholderText("Type / for AI commands...");
    fireEvent.change(input, { target: { value: "/generate a diagram" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledWith("/generate a diagram");
  });

  it("clears input after submit", () => {
    const onSubmit = vi.fn();
    render(<AiCommandBar onSubmit={onSubmit} isLoading={false} />);
    const input = screen.getByPlaceholderText("Type / for AI commands...");
    fireEvent.change(input, { target: { value: "/test" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect((input as HTMLInputElement).value).toBe("");
  });

  it("does not submit empty input", () => {
    const onSubmit = vi.fn();
    render(<AiCommandBar onSubmit={onSubmit} isLoading={false} />);
    const input = screen.getByPlaceholderText("Type / for AI commands...");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows loading state when isLoading is true", () => {
    render(<AiCommandBar onSubmit={vi.fn()} isLoading={true} />);
    expect(screen.getByText("Processing...")).toBeInTheDocument();
  });

  it("disables input when loading", () => {
    render(<AiCommandBar onSubmit={vi.fn()} isLoading={true} />);
    const input = screen.getByPlaceholderText("Type / for AI commands...");
    expect(input).toBeDisabled();
  });

  it("can be collapsed and expanded", () => {
    render(<AiCommandBar onSubmit={vi.fn()} isLoading={false} />);
    const toggleBtn = screen.getByLabelText("Toggle AI command bar");
    // Initially expanded — input should be visible
    expect(screen.getByPlaceholderText("Type / for AI commands...")).toBeVisible();
    // Collapse
    fireEvent.click(toggleBtn);
    expect(screen.queryByPlaceholderText("Type / for AI commands...")).not.toBeInTheDocument();
    // Expand
    fireEvent.click(toggleBtn);
    expect(screen.getByPlaceholderText("Type / for AI commands...")).toBeInTheDocument();
  });

  it("renders result preview area as placeholder", () => {
    render(
      <AiCommandBar onSubmit={vi.fn()} isLoading={false} resultPreview="Generated 3 sticky notes" />
    );
    expect(screen.getByText("Generated 3 sticky notes")).toBeInTheDocument();
  });
});
