import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BoardSettings } from "../BoardSettings";

describe("BoardSettings", () => {
  it("renders grid style options", () => {
    const onChange = vi.fn();
    render(
      <BoardSettings
        gridStyle="dots"
        backgroundColor="#FFFFFF"
        onGridStyleChange={onChange}
        onBackgroundColorChange={vi.fn()}
      />
    );
    expect(screen.getByText("Grid")).toBeDefined();
    expect(screen.getByRole("button", { name: "Dots" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Lines" })).toBeDefined();
    expect(screen.getByRole("button", { name: "None" })).toBeDefined();
  });

  it("highlights the active grid style", () => {
    render(
      <BoardSettings
        gridStyle="dots"
        backgroundColor="#FFFFFF"
        onGridStyleChange={vi.fn()}
        onBackgroundColorChange={vi.fn()}
      />
    );
    const dotsBtn = screen.getByRole("button", { name: "Dots" });
    expect(dotsBtn.className).toContain("bg-blue");
  });

  it("calls onGridStyleChange when grid style is clicked", () => {
    const onChange = vi.fn();
    render(
      <BoardSettings
        gridStyle="dots"
        backgroundColor="#FFFFFF"
        onGridStyleChange={onChange}
        onBackgroundColorChange={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Lines" }));
    expect(onChange).toHaveBeenCalledWith("lines");
  });

  it("renders background color presets", () => {
    render(
      <BoardSettings
        gridStyle="dots"
        backgroundColor="#FFFFFF"
        onGridStyleChange={vi.fn()}
        onBackgroundColorChange={vi.fn()}
      />
    );
    expect(screen.getByText("Background")).toBeDefined();
    // Should have at least 4 background color buttons
    const bgButtons = screen.getAllByTestId("bg-color-btn");
    expect(bgButtons.length).toBeGreaterThanOrEqual(4);
  });

  it("calls onBackgroundColorChange when a bg color is clicked", () => {
    const onChange = vi.fn();
    render(
      <BoardSettings
        gridStyle="dots"
        backgroundColor="#FFFFFF"
        onGridStyleChange={vi.fn()}
        onBackgroundColorChange={onChange}
      />
    );
    const bgButtons = screen.getAllByTestId("bg-color-btn");
    fireEvent.click(bgButtons[1]);
    expect(onChange).toHaveBeenCalled();
  });

  it("highlights the current background color", () => {
    render(
      <BoardSettings
        gridStyle="dots"
        backgroundColor="#F5F5F5"
        onGridStyleChange={vi.fn()}
        onBackgroundColorChange={vi.fn()}
      />
    );
    const bgButtons = screen.getAllByTestId("bg-color-btn");
    const activeBtn = bgButtons.find((b) => b.className.includes("border-blue"));
    expect(activeBtn).toBeDefined();
  });
});
