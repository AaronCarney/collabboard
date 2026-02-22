import { describe, it, expect, beforeEach } from "vitest";
import { getZoomFactor, getZoomSpeed, setZoomSpeed, getZoomSensitivity } from "@/lib/zoom-speed";
import type { ZoomSpeedLevel } from "@/lib/zoom-speed";

describe("zoom-speed", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("getZoomFactor", () => {
    it("returns 1.05 for slow", () => {
      expect(getZoomFactor("slow")).toBe(1.05);
    });

    it("returns 1.1 for normal", () => {
      expect(getZoomFactor("normal")).toBe(1.1);
    });

    it("returns 1.25 for fast", () => {
      expect(getZoomFactor("fast")).toBe(1.25);
    });

    it("defaults to 1.1 when no argument is passed and nothing stored", () => {
      expect(getZoomFactor()).toBe(1.1);
    });

    it("reads from localStorage when no argument is passed", () => {
      setZoomSpeed("fast");
      expect(getZoomFactor()).toBe(1.25);
    });

    it("returns 1.1 for unknown speed value", () => {
      expect(getZoomFactor("bogus" as ZoomSpeedLevel)).toBe(1.1);
    });
  });

  describe("getZoomSpeed", () => {
    it("returns 'normal' by default", () => {
      expect(getZoomSpeed()).toBe("normal");
    });

    it("returns 'slow' when stored", () => {
      localStorage.setItem("collabboard:zoom-speed", "slow");
      expect(getZoomSpeed()).toBe("slow");
    });

    it("returns 'fast' when stored", () => {
      localStorage.setItem("collabboard:zoom-speed", "fast");
      expect(getZoomSpeed()).toBe("fast");
    });

    it("returns 'normal' for invalid stored value", () => {
      localStorage.setItem("collabboard:zoom-speed", "turbo");
      expect(getZoomSpeed()).toBe("normal");
    });
  });

  describe("getZoomSensitivity", () => {
    it("returns a sensitivity multiplier for exponential zoom", () => {
      const sensitivity = getZoomSensitivity("normal");
      // A larger delta should produce a larger zoom factor via Math.exp(delta * sensitivity)
      const smallDelta = 0.05;
      const largeDelta = 0.2;
      const smallFactor = Math.exp(smallDelta * sensitivity);
      const largeFactor = Math.exp(largeDelta * sensitivity);
      expect(largeFactor).toBeGreaterThan(smallFactor);
      expect(smallFactor).toBeGreaterThan(1);
    });

    it("slow sensitivity produces smaller zoom change than normal", () => {
      const delta = 0.1;
      const slowFactor = Math.exp(delta * getZoomSensitivity("slow"));
      const normalFactor = Math.exp(delta * getZoomSensitivity("normal"));
      expect(normalFactor).toBeGreaterThan(slowFactor);
    });

    it("fast sensitivity produces larger zoom change than normal", () => {
      const delta = 0.1;
      const normalFactor = Math.exp(delta * getZoomSensitivity("normal"));
      const fastFactor = Math.exp(delta * getZoomSensitivity("fast"));
      expect(fastFactor).toBeGreaterThan(normalFactor);
    });
  });

  describe("setZoomSpeed", () => {
    it("persists the value to localStorage", () => {
      setZoomSpeed("slow");
      expect(localStorage.getItem("collabboard:zoom-speed")).toBe("slow");
    });

    it("round-trips with getZoomSpeed", () => {
      setZoomSpeed("fast");
      expect(getZoomSpeed()).toBe("fast");
      setZoomSpeed("slow");
      expect(getZoomSpeed()).toBe("slow");
      setZoomSpeed("normal");
      expect(getZoomSpeed()).toBe("normal");
    });
  });
});
