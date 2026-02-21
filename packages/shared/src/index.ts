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
} from "./types/board";

export { PLACEHOLDER_CONTENT, OBJECT_DEFAULTS, USER_COLORS } from "./types/board";

export {
  boardObjectSchema,
  stickyNoteSchema,
  rectangleSchema,
  circleSchema,
  textSchema,
  lineSchema,
  linePropertiesSchema,
  connectorSchema,
  connectorPropertiesSchema,
  frameSchema,
} from "./schemas/board-objects";

export type { BoardObjectZod } from "./schemas/board-objects";

export { FREE_TIER_BOARD_LIMIT } from "./constants";

export { z } from "zod";

export {
  accessLevelSchema,
  boardShareSchema,
  createShareRequestSchema,
  deleteShareRequestSchema,
} from "./schemas/board-shares";

export type {
  AccessLevel,
  BoardShare,
  CreateShareRequest,
  DeleteShareRequest,
} from "./schemas/board-shares";
