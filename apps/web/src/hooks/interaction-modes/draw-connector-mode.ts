import type { BoardObject, PortName, ConnectorObject } from "@collabboard/shared";
import type { InteractionMode, InteractionContext, CanvasPointerEvent } from "../interaction-types";

export interface ConnectorDrawState {
  sourceId: string | null;
  sourcePort: PortName | null;
  cursorX: number | undefined;
  cursorY: number | undefined;
}

export interface DrawConnectorMode extends InteractionMode {
  getState(): ConnectorDrawState;
  reset(): void;
}

function getNearestPort(obj: BoardObject, wx: number, wy: number): PortName {
  const ports: Record<PortName, { x: number; y: number }> = {
    top: { x: obj.x + obj.width / 2, y: obj.y },
    right: { x: obj.x + obj.width, y: obj.y + obj.height / 2 },
    bottom: { x: obj.x + obj.width / 2, y: obj.y + obj.height },
    left: { x: obj.x, y: obj.y + obj.height / 2 },
    center: { x: obj.x + obj.width / 2, y: obj.y + obj.height / 2 },
  };

  let nearest: PortName = "top";
  let minDist = Infinity;

  for (const [name, pos] of Object.entries(ports) as [PortName, { x: number; y: number }][]) {
    const dist = (wx - pos.x) ** 2 + (wy - pos.y) ** 2;
    if (dist < minDist) {
      minDist = dist;
      nearest = name;
    }
  }

  return nearest;
}

function hitTestObjects(ctx: InteractionContext, wx: number, wy: number): BoardObject | null {
  for (const obj of ctx.objects.values()) {
    const renderer = ctx.getRenderer(obj.type);
    if (renderer.hitTest(obj, wx, wy)) {
      return obj;
    }
  }
  return null;
}

/** Factory that creates a stateful connector-drawing interaction mode. */
export function createDrawConnectorMode(): DrawConnectorMode {
  let sourceId: string | null = null;
  let sourcePort: PortName | null = null;
  let cursorX: number | undefined = undefined;
  let cursorY: number | undefined = undefined;

  return {
    cursor: "crosshair",

    getState(): ConnectorDrawState {
      return { sourceId, sourcePort, cursorX, cursorY };
    },

    reset(): void {
      sourceId = null;
      sourcePort = null;
      cursorX = undefined;
      cursorY = undefined;
    },

    onPointerDown(ctx: InteractionContext, e: CanvasPointerEvent): void {
      const hit = hitTestObjects(ctx, e.worldX, e.worldY);
      if (hit) {
        sourceId = hit.id;
        sourcePort = getNearestPort(hit, e.worldX, e.worldY);
        cursorX = e.worldX;
        cursorY = e.worldY;
      } else {
        sourceId = null;
        sourcePort = null;
        cursorX = undefined;
        cursorY = undefined;
      }
    },

    onPointerMove(ctx: InteractionContext, e: CanvasPointerEvent): void {
      // ctx is required by the interface but not used here
      void ctx;
      if (sourceId !== null) {
        cursorX = e.worldX;
        cursorY = e.worldY;
      }
    },

    onPointerUp(ctx: InteractionContext, e: CanvasPointerEvent): void {
      if (sourceId === null || sourcePort === null) {
        return;
      }

      const hit = hitTestObjects(ctx, e.worldX, e.worldY);

      if (hit && hit.id !== sourceId) {
        const targetPort = getNearestPort(hit, e.worldX, e.worldY);
        const now = new Date().toISOString();

        // board_id and created_by are empty placeholders — the caller's
        // InteractionContext.mutate wrapper is responsible for enriching
        // objects with board_id and created_by before persisting, consistent
        // with how store.createObject fills these from boardId/userId.
        const connector: ConnectorObject = {
          id: crypto.randomUUID(),
          board_id: "",
          type: "connector",
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          rotation: 0,
          content: "",
          color: "#333333",
          opacity: 1,
          version: 1,
          created_by: "",
          created_at: now,
          updated_at: now,
          parent_frame_id: null,
          properties: {
            from_object_id: sourceId,
            to_object_id: hit.id,
            from_port: sourcePort,
            to_port: targetPort,
            arrow_style: "end",
            stroke_style: "solid",
          },
        };

        ctx.mutate([connector]);
      }

      sourceId = null;
      sourcePort = null;
      cursorX = undefined;
      cursorY = undefined;
    },
  };
}

/** Legacy export for backward compatibility until page.tsx is updated. */
export const drawConnectorMode: InteractionMode = createDrawConnectorMode();
