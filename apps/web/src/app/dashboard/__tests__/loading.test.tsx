import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import DashboardLoading from "../loading";

describe("DashboardLoading", () => {
  it("renders skeleton elements with animate-pulse", () => {
    const { container } = render(<DashboardLoading />);
    const pulseElements = container.querySelectorAll(".animate-pulse");
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it("renders board card skeleton grid", () => {
    const { container } = render(<DashboardLoading />);
    const grid = container.querySelector(".grid");
    expect(grid).toBeInTheDocument();
    // 6 skeleton cards
    expect(grid?.children.length).toBe(6);
  });

  it("has a default export", () => {
    expect(DashboardLoading).toBeDefined();
    expect(typeof DashboardLoading).toBe("function");
  });
});
