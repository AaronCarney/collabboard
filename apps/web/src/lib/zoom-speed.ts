const ZOOM_SPEED_KEY = "collabboard:zoom-speed";

export type ZoomSpeedLevel = "slow" | "normal" | "fast";

export function getZoomFactor(level?: ZoomSpeedLevel): number {
  const speed = level ?? getZoomSpeed();
  switch (speed) {
    case "slow":
      return 1.05;
    case "normal":
      return 1.1;
    case "fast":
      return 1.25;
    default:
      return 1.1;
  }
}

export function getZoomSpeed(): ZoomSpeedLevel {
  if (typeof window === "undefined") return "normal";
  const stored = localStorage.getItem(ZOOM_SPEED_KEY);
  if (stored === "slow" || stored === "fast") return stored;
  return "normal";
}

export function setZoomSpeed(speed: ZoomSpeedLevel): void {
  localStorage.setItem(ZOOM_SPEED_KEY, speed);
}
