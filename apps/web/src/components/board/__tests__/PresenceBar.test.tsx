import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PresenceBar } from "../PresenceBar";
import type { PresenceUser } from "@/types/board";

describe("PresenceBar", () => {
  const mockUsers: PresenceUser[] = [
    { userId: "user-1", userName: "Alice", color: "#ff0000", onlineAt: new Date().toISOString() },
    { userId: "user-2", userName: "Bob", color: "#00ff00", onlineAt: new Date().toISOString() },
  ];

  it("renders user names", () => {
    render(<PresenceBar users={mockUsers} currentUserId="user-1" />);
    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("positions below MenuBar with top-14", () => {
    const { container } = render(<PresenceBar users={mockUsers} currentUserId="user-1" />);
    const bar = container.firstElementChild;
    expect(bar?.className).toContain("top-14");
    expect(bar?.className).not.toContain("top-4");
  });
});
