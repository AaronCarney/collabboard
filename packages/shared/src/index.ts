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
