// Re-export all types from @collabboard/shared for backward compatibility.
// New code should import directly from "@collabboard/shared".
export type {
  ObjectType,
  ToolType,
  BoardObject,
  StickyNoteObject,
  RectangleObject,
  CircleObject,
  TextObject,
  LineObject,
  LineProperties,
  ConnectorObject,
  ConnectorProperties,
  FrameObject,
  PortName,
  Board,
  CursorPosition,
  PresenceUser,
} from "@collabboard/shared";

export { PLACEHOLDER_CONTENT, OBJECT_DEFAULTS, USER_COLORS } from "@collabboard/shared";
