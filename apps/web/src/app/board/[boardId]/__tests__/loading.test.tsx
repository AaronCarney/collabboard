import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import BoardLoading from "../loading";

describe("BoardLoading", () => {
  it("renders skeleton elements with animate-pulse", () => {
    const { container } = render(<BoardLoading />);
    const pulseElements = container.querySelectorAll(".animate-pulse");
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it("renders menubar skeleton at top", () => {
    const { container } = render(<BoardLoading />);
    const menubar = container.querySelector(".h-12");
    expect(menubar).toBeInTheDocument();
  });

  it("renders sidebar skeleton on left", () => {
    const { container } = render(<BoardLoading />);
    const sidebar = container.querySelector(".w-12");
    expect(sidebar).toBeInTheDocument();
  });

  it("has a default export", () => {
    expect(BoardLoading).toBeDefined();
    expect(typeof BoardLoading).toBe("function");
  });
});
