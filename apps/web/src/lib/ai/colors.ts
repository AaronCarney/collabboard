export const AI_COLOR_PALETTE = {
  yellow: "#FFEB3B",
  blue: "#90CAF9",
  green: "#A5D6A7",
  pink: "#EF9A9A",
  orange: "#FFE082",
  purple: "#CE93D8",
  red: "#EF5350",
  teal: "#80CBC4",
  lime: "#C5E1A5",
  gray: "#E0E0E0",
  white: "#FFFFFF",
  lightblue: "#81D4FA",
} as const;

export type AIColorName = keyof typeof AI_COLOR_PALETTE;

export const AI_COLOR_NAMES: AIColorName[] = Object.keys(AI_COLOR_PALETTE) as AIColorName[];

const TYPE_DEFAULTS: Record<string, string> = {
  sticky_note: "#FFEB3B",
  shape: "#81D4FA",
  frame: "#E0E0E0",
};

const FALLBACK_COLOR = "#FFEB3B";

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export function resolveColor(name: string | undefined, objectType: string): string {
  if (name && name in AI_COLOR_PALETTE) {
    return AI_COLOR_PALETTE[name as AIColorName];
  }
  if (name && HEX_COLOR_REGEX.test(name)) {
    return name;
  }
  return TYPE_DEFAULTS[objectType] ?? FALLBACK_COLOR;
}
