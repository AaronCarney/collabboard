import type { BoardObject } from "@collabboard/shared";
import type { ShapeRenderer } from "@/components/board/renderers/types";

export interface CanvasPointerEvent {
  /** World-space X coordinate (after camera transform). */
  worldX: number;
  /** World-space Y coordinate (after camera transform). */
  worldY: number;
  /** Screen-space X coordinate. */
  screenX: number;
  /** Screen-space Y coordinate. */
  screenY: number;
  /** Whether shift key is held. */
  shiftKey: boolean;
  /** Whether ctrl/meta key is held. */
  ctrlKey: boolean;
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface InteractionContext {
  camera: Camera;
  objects: Map<string, BoardObject>;
  selectedIds: Set<string>;
  mutate(objects: BoardObject[]): void;
  selectObjects(ids: Set<string>): void;
  getRenderer(type: string): ShapeRenderer;
}

/** Strategy pattern: each tool mode implements this interface. */
export interface InteractionMode {
  onPointerDown(ctx: InteractionContext, e: CanvasPointerEvent): void;
  onPointerMove(ctx: InteractionContext, e: CanvasPointerEvent): void;
  onPointerUp(ctx: InteractionContext, e: CanvasPointerEvent): void;
  cursor: string;
}
