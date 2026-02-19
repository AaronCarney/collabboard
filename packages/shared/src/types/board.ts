export type ObjectType =
  | "sticky_note"
  | "rectangle"
  | "circle"
  | "text"
  | "line"
  | "connector"
  | "frame";

export type ToolType =
  | "select"
  | "pan"
  | "sticky_note"
  | "rectangle"
  | "circle"
  | "text"
  | "line"
  | "connector"
  | "frame";

interface BaseObject {
  id: string;
  board_id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  content: string;
  color: string;
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  parent_frame_id: string | null;
}

export interface StickyNoteObject extends BaseObject {
  type: "sticky_note";
  properties: Record<string, never>;
}

export interface RectangleObject extends BaseObject {
  type: "rectangle";
  properties: Record<string, never>;
}

export interface CircleObject extends BaseObject {
  type: "circle";
  properties: Record<string, never>;
}

export interface TextObject extends BaseObject {
  type: "text";
  properties: Record<string, never>;
}

export interface LineProperties {
  x2: number;
  y2: number;
  arrow_style: "none" | "end" | "both";
  stroke_style: "solid" | "dashed" | "dotted";
  stroke_width: number;
}

export interface LineObject extends BaseObject {
  type: "line";
  properties: LineProperties;
}

export type PortName = "top" | "right" | "bottom" | "left" | "center";

export interface ConnectorProperties {
  from_object_id: string;
  to_object_id: string;
  from_port: PortName;
  to_port: PortName;
  arrow_style: "none" | "end" | "both";
  stroke_style: "solid" | "dashed" | "dotted";
}

export interface ConnectorObject extends BaseObject {
  type: "connector";
  properties: ConnectorProperties;
}

export interface FrameObject extends BaseObject {
  type: "frame";
  properties: Record<string, never>;
}

export type BoardObject =
  | StickyNoteObject
  | RectangleObject
  | CircleObject
  | TextObject
  | LineObject
  | ConnectorObject
  | FrameObject;

export interface Board {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CursorPosition {
  userId: string;
  userName: string;
  x: number;
  y: number;
  color: string;
}

export interface PresenceUser {
  userId: string;
  userName: string;
  color: string;
  onlineAt: string;
}

export const PLACEHOLDER_CONTENT: Partial<Record<ObjectType, string>> = {
  sticky_note: "New note",
  text: "Text",
};

export const OBJECT_DEFAULTS: Record<ObjectType, Partial<BoardObject>> = {
  sticky_note: { width: 200, height: 200, color: "#FFEB3B", content: "" },
  rectangle: { width: 200, height: 150, color: "#42A5F5", content: "" },
  circle: { width: 150, height: 150, color: "#66BB6A", content: "" },
  text: { width: 200, height: 40, color: "transparent", content: "" },
  line: { width: 0, height: 0, color: "#333333", content: "" },
  connector: { width: 0, height: 0, color: "#333333", content: "" },
  frame: { width: 400, height: 300, color: "#E0E0E0", content: "" },
};

export const USER_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E9",
  "#F0B27A",
  "#82E0AA",
];
