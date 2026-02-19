import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }),
}));

import { showToast, showActionToast } from "../toast";
import { toast } from "sonner";

describe("showToast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls toast.success for success type", () => {
    showToast("Done!", "success");
    expect(toast.success).toHaveBeenCalledWith("Done!");
  });

  it("calls toast.error for error type", () => {
    showToast("Failed!", "error");
    expect(toast.error).toHaveBeenCalledWith("Failed!");
  });

  it("calls toast.warning for warning type", () => {
    showToast("Careful!", "warning");
    expect(toast.warning).toHaveBeenCalledWith("Careful!");
  });

  it("calls toast.info for info type", () => {
    showToast("FYI", "info");
    expect(toast.info).toHaveBeenCalledWith("FYI");
  });

  it("defaults to info when no type specified", () => {
    showToast("Hello");
    expect(toast.info).toHaveBeenCalledWith("Hello");
  });
});

describe("showActionToast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls toast with message and action", () => {
    const action = { label: "Undo", onClick: vi.fn() };
    showActionToast("Item deleted", action);
    expect(toast).toHaveBeenCalledWith("Item deleted", { action });
  });
});
