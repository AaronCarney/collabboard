"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import type { BoardObject, CursorPosition, ObjectType } from "@/types/board";
import type { Camera } from "@/lib/board-store";
import type { HandlePosition, SelectionRect } from "@/lib/board-logic";
import {
  screenToWorld as screenToWorldFn,
  hitTest as hitTestFn,
  objectsInRect,
  getResizeHandles,
  hitTestHandle,
} from "@/lib/board-logic";
import { hasRenderer, getRenderer } from "@/components/board/renderers/renderer-registry";
import "@/components/board/renderers/init";

interface BoardCanvasProps {
  objects: BoardObject[];
  camera: Camera;
  selectedIds: string[];
  editingId: string | null;
  activeTool: ObjectType | "select";
  isSpaceHeld: boolean;
  cursors: Map<string, CursorPosition>;
  onCanvasClick: (worldX: number, worldY: number) => void;
  onObjectSelect: (id: string | null, additive: boolean) => void;
  onObjectClick: (id: string) => void;
  onObjectsMove: (moves: { id: string; x: number; y: number }[], persist?: boolean) => void;
  onObjectDoubleClick: (id: string) => void;
  onSelectionBox: (ids: string[]) => void;
  onObjectResize: (
    id: string,
    bounds: { x: number; y: number; width: number; height: number }
  ) => void;
  onPan: (dx: number, dy: number) => void;
  onZoom: (delta: number, cx: number, cy: number) => void;
  onCursorMove: (worldX: number, worldY: number) => void;
}

const HANDLE_SIZE = 8;
const MIN_OBJECT_SIZE = 20;
const CLICK_THRESHOLD = 3;

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function BoardCanvas({
  objects,
  camera,
  selectedIds,
  editingId: _editingId,
  activeTool,
  isSpaceHeld,
  cursors,
  onCanvasClick,
  onObjectSelect,
  onObjectClick,
  onObjectsMove,
  onObjectDoubleClick,
  onSelectionBox,
  onObjectResize,
  onPan,
  onZoom,
  onCursorMove,
}: BoardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const dragStartPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const [resizeHandle, setResizeHandle] = useState<HandlePosition | null>(null);
  const [resizeObjStart, setResizeObjStart] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [resizeObjId, setResizeObjId] = useState<string | null>(null);
  const clickedSelectedIdRef = useRef<string | null>(null);
  const draggedObjIdRef = useRef<string | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastResizeBroadcast = useRef(0);

  // Screen to world coords
  const screenToWorld = useCallback(
    (sx: number, sy: number) => screenToWorldFn(sx, sy, camera),
    [camera]
  );

  // Hit test
  const hitTest = useCallback(
    (wx: number, wy: number): BoardObject | null => hitTestFn(wx, wy, objects),
    [objects]
  );

  // Render
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = "#f8f9fa";
    ctx.fillRect(0, 0, w, h);

    // Apply camera
    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    // Grid
    drawGrid(ctx, camera, w, h);

    // Compute viewport bounds in world space for culling
    const vpLeft = -camera.x / camera.zoom;
    const vpTop = -camera.y / camera.zoom;
    const vpRight = vpLeft + w / camera.zoom;
    const vpBottom = vpTop + h / camera.zoom;
    const canCull = w > 0 && h > 0;

    // Objects — use registry-based rendering with viewport culling
    for (const obj of objects) {
      // Viewport culling: skip objects entirely outside the viewport
      if (
        canCull &&
        (obj.x + obj.width < vpLeft ||
          obj.x > vpRight ||
          obj.y + obj.height < vpTop ||
          obj.y > vpBottom)
      ) {
        continue;
      }

      const isSelected = selectedIds.includes(obj.id);
      if (hasRenderer(obj.type)) {
        const renderer = getRenderer(obj.type);
        renderer.draw(ctx, obj, isSelected);
      } else {
        drawObjectFallback(ctx, obj, isSelected);
      }
      if (isSelected) {
        drawResizeHandles(ctx, obj, camera.zoom);
      }
    }

    // Selection rectangle
    if (selectionRect) {
      drawSelectionRect(ctx, selectionRect);
    }

    // Remote cursors
    for (const [, cursor] of cursors) {
      drawCursor(ctx, cursor);
    }

    ctx.restore();
  }, [objects, camera, selectedIds, cursors, selectionRect]);

  // Animation loop
  useEffect(() => {
    const loop = () => {
      render();
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [render]);

  // Resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.style.width = "100%";
      canvas.style.height = "100%";
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Mouse handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const world = screenToWorld(sx, sy);

      // Middle mouse = pan always
      if (e.button === 1) {
        setIsPanning(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        e.preventDefault();
        return;
      }

      // Space held = pan from anywhere
      if (isSpaceHeld) {
        setIsPanning(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        return;
      }

      // Check for resize handle hit on selected objects
      for (const id of selectedIds) {
        const obj = objects.find((o) => o.id === id);
        if (obj) {
          const handlePos = hitTestHandle(world.x, world.y, obj, HANDLE_SIZE / camera.zoom);
          if (handlePos) {
            setIsResizing(true);
            setResizeHandle(handlePos);
            setResizeObjId(obj.id);
            setResizeObjStart({ x: obj.x, y: obj.y, width: obj.width, height: obj.height });
            setDragStart({ x: e.clientX, y: e.clientY });
            return;
          }
        }
      }

      const hit = hitTest(world.x, world.y);
      if (hit) {
        const wasAlreadySelected = selectedIds.includes(hit.id);
        if (wasAlreadySelected && !e.shiftKey) {
          // Click on already-selected object (no shift): set up click-again-to-edit
          clickedSelectedIdRef.current = hit.id;
        } else {
          // New selection or Shift+toggle
          clickedSelectedIdRef.current = null;
          onObjectSelect(hit.id, e.shiftKey);
        }
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        // Snapshot all selected objects' positions for multi-drag.
        // Known limitation: when Shift+clicking a new object, onObjectSelect fires above
        // but selectedIds won't include it until re-render, so only the clicked object moves.
        // Fix would require lifting selection into a ref or passing updated IDs synchronously.
        const positions = new Map<string, { x: number; y: number }>();
        const currentSelectedIds = selectedIds.includes(hit.id) ? selectedIds : [hit.id];
        for (const sid of currentSelectedIds) {
          const obj = objects.find((o) => o.id === sid);
          if (obj) positions.set(sid, { x: obj.x, y: obj.y });
        }
        dragStartPositionsRef.current = positions;
        draggedObjIdRef.current = hit.id;
      } else {
        if (activeTool === "select") {
          // Start rubber-band selection on empty space
          setIsSelecting(true);
          setDragStart({ x: e.clientX, y: e.clientY });
          setSelectionRect({ x: world.x, y: world.y, width: 0, height: 0 });
        }
        onObjectSelect(null, false);
      }
    },
    [
      screenToWorld,
      hitTest,
      onObjectSelect,
      activeTool,
      isSpaceHeld,
      selectedIds,
      objects,
      camera.zoom,
    ]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const world = screenToWorld(sx, sy);

      onCursorMove(world.x, world.y);

      if (isPanning) {
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        onPan(dx, dy);
        setDragStart({ x: e.clientX, y: e.clientY });
        return;
      }

      if (isResizing && resizeObjStart && resizeHandle && resizeObjId) {
        const dx = (e.clientX - dragStart.x) / camera.zoom;
        const dy = (e.clientY - dragStart.y) / camera.zoom;
        const bounds = computeResizeBounds(resizeObjStart, resizeHandle, dx, dy);

        // Throttle broadcasts to 50ms
        const now = Date.now();
        if (now - lastResizeBroadcast.current > 50) {
          lastResizeBroadcast.current = now;
          onObjectResize(resizeObjId, bounds);
        }
        return;
      }

      if (isSelecting) {
        const startWorld = screenToWorld(dragStart.x - rect.left, dragStart.y - rect.top);
        setSelectionRect({
          x: startWorld.x,
          y: startWorld.y,
          width: world.x - startWorld.x,
          height: world.y - startWorld.y,
        });
        return;
      }

      if (isDragging && selectedIds.length > 0) {
        const dx = (e.clientX - dragStart.x) / camera.zoom;
        const dy = (e.clientY - dragStart.y) / camera.zoom;
        // If we moved, clear the clicked-selected flag
        if (
          Math.abs(e.clientX - dragStart.x) > CLICK_THRESHOLD ||
          Math.abs(e.clientY - dragStart.y) > CLICK_THRESHOLD
        ) {
          clickedSelectedIdRef.current = null;
        }
        // Move all selected objects by the same delta.
        // Known limitation: broadcasts fire every mousemove (no throttle). Throttling here
        // would make local rendering laggy since moveObjects drives React state. To fix,
        // split moveObjects into local-only state update vs. throttled broadcast side-effect.
        const positions = dragStartPositionsRef.current;
        if (positions.size > 0) {
          const moves: { id: string; x: number; y: number }[] = [];
          for (const [id, start] of positions) {
            moves.push({ id, x: start.x + dx, y: start.y + dy });
          }
          onObjectsMove(moves);
        }
      }
    },
    [
      screenToWorld,
      onCursorMove,
      isPanning,
      isDragging,
      isSelecting,
      isResizing,
      selectedIds,
      dragStart,
      camera.zoom,
      onPan,
      onObjectsMove,
      onObjectResize,
      resizeHandle,
      resizeObjStart,
      resizeObjId,
      objects,
    ]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (isResizing && resizeObjStart && resizeHandle && resizeObjId) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const dx = (e.clientX - dragStart.x) / camera.zoom;
          const dy = (e.clientY - dragStart.y) / camera.zoom;
          const bounds = computeResizeBounds(resizeObjStart, resizeHandle, dx, dy);
          onObjectResize(resizeObjId, bounds);
        }
        setIsResizing(false);
        setResizeHandle(null);
        setResizeObjStart(null);
        setResizeObjId(null);
        return;
      }

      if (isSelecting && selectionRect) {
        const selected = objectsInRect(selectionRect, objects);
        onSelectionBox(selected.map((o) => o.id));
        setIsSelecting(false);
        setSelectionRect(null);
        return;
      }

      if (!isDragging && !isPanning && !isSelecting) {
        // Click on empty space with a creation tool
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const sx = e.clientX - rect.left;
          const sy = e.clientY - rect.top;
          const world = screenToWorld(sx, sy);
          onCanvasClick(world.x, world.y);
        }
      }

      // Check for click-again-to-edit
      if (clickedSelectedIdRef.current) {
        const movedX = Math.abs(e.clientX - dragStart.x);
        const movedY = Math.abs(e.clientY - dragStart.y);
        if (movedX < CLICK_THRESHOLD && movedY < CLICK_THRESHOLD) {
          onObjectClick(clickedSelectedIdRef.current);
        }
        clickedSelectedIdRef.current = null;
      }

      if (isDragging && dragStartPositionsRef.current.size > 0) {
        // Persist final positions computed from snapshot + total delta
        const dx = (e.clientX - dragStart.x) / camera.zoom;
        const dy = (e.clientY - dragStart.y) / camera.zoom;
        const movedDistance = Math.abs(e.clientX - dragStart.x) + Math.abs(e.clientY - dragStart.y);
        if (movedDistance > CLICK_THRESHOLD) {
          const moves: { id: string; x: number; y: number }[] = [];
          for (const [id, start] of dragStartPositionsRef.current) {
            moves.push({ id, x: start.x + dx, y: start.y + dy });
          }
          onObjectsMove(moves, true);
        }
        dragStartPositionsRef.current = new Map();
      }
      setIsDragging(false);
      setIsPanning(false);
      draggedObjIdRef.current = null;
    },
    [
      isDragging,
      isPanning,
      isSelecting,
      isResizing,
      selectedIds,
      selectionRect,
      screenToWorld,
      onCanvasClick,
      objects,
      onObjectsMove,
      onObjectClick,
      onSelectionBox,
      onObjectResize,
      dragStart,
      camera.zoom,
      resizeHandle,
      resizeObjStart,
      resizeObjId,
    ]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const world = screenToWorld(sx, sy);
      const hit = hitTest(world.x, world.y);
      if (hit) {
        onObjectDoubleClick(hit.id);
      }
    },
    [screenToWorld, hitTest, onObjectDoubleClick]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      onZoom(-e.deltaY * 0.001, e.clientX - rect.left, e.clientY - rect.top);
    },
    [onZoom]
  );

  const cursorClass = isSpaceHeld
    ? isPanning
      ? "cursor-grabbing"
      : "cursor-grab"
    : "cursor-crosshair";

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        className={`w-full h-full ${cursorClass}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsDragging(false);
          setIsPanning(false);
          setIsSelecting(false);
          setSelectionRect(null);
          setIsResizing(false);
          setResizeHandle(null);
          setResizeObjStart(null);
          setResizeObjId(null);
          draggedObjIdRef.current = null;
          dragStartPositionsRef.current = new Map();
        }}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        onContextMenu={(e) => {
          e.preventDefault();
        }}
      />
    </div>
  );
}

// ---- Resize bounds computation ----

function computeResizeBounds(
  start: { x: number; y: number; width: number; height: number },
  handle: HandlePosition,
  dx: number,
  dy: number
): { x: number; y: number; width: number; height: number } {
  let { x, y, width, height } = start;

  if (handle.includes("w")) {
    x = start.x + dx;
    width = start.width - dx;
  }
  if (handle.includes("e")) {
    width = start.width + dx;
  }
  if (handle.includes("n")) {
    y = start.y + dy;
    height = start.height - dy;
  }
  if (handle.includes("s")) {
    height = start.height + dy;
  }

  // Enforce minimum size
  if (width < MIN_OBJECT_SIZE) {
    if (handle.includes("w")) {
      x = start.x + start.width - MIN_OBJECT_SIZE;
    }
    width = MIN_OBJECT_SIZE;
  }
  if (height < MIN_OBJECT_SIZE) {
    if (handle.includes("n")) {
      y = start.y + start.height - MIN_OBJECT_SIZE;
    }
    height = MIN_OBJECT_SIZE;
  }

  return { x, y, width, height };
}

// ---- Rendering helpers ----

function drawGrid(ctx: CanvasRenderingContext2D, camera: Camera, w: number, h: number) {
  const gridSize = 50;
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1 / camera.zoom;

  const startX = Math.floor(-camera.x / camera.zoom / gridSize) * gridSize;
  const startY = Math.floor(-camera.y / camera.zoom / gridSize) * gridSize;
  const endX = startX + w / camera.zoom + gridSize;
  const endY = startY + h / camera.zoom + gridSize;

  ctx.beginPath();
  for (let x = startX; x <= endX; x += gridSize) {
    ctx.moveTo(x, startY);
    ctx.lineTo(x, endY);
  }
  for (let y = startY; y <= endY; y += gridSize) {
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
  }
  ctx.stroke();
}

/** Fallback renderer for object types without a registered renderer. */
function drawObjectFallback(ctx: CanvasRenderingContext2D, obj: BoardObject, selected: boolean) {
  ctx.save();
  ctx.fillStyle = obj.color || "#ccc";
  ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
  if (selected) {
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 3;
    ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
  }
  ctx.restore();
}

function drawResizeHandles(ctx: CanvasRenderingContext2D, obj: BoardObject, zoom: number) {
  const handles = getResizeHandles(obj);
  // Constant screen-pixel size regardless of zoom
  const size = HANDLE_SIZE / zoom;

  ctx.save();
  for (const handle of handles) {
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2 / zoom;
    ctx.fillRect(handle.x - size / 2, handle.y - size / 2, size, size);
    ctx.strokeRect(handle.x - size / 2, handle.y - size / 2, size, size);
  }
  ctx.restore();
}

function drawSelectionRect(ctx: CanvasRenderingContext2D, rect: SelectionRect) {
  ctx.save();
  ctx.fillStyle = "rgba(59, 130, 246, 0.1)";
  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
  ctx.setLineDash([]);
  ctx.restore();
}

function drawCursor(ctx: CanvasRenderingContext2D, cursor: CursorPosition) {
  ctx.save();
  ctx.translate(cursor.x, cursor.y);

  // Arrow
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 16);
  ctx.lineTo(4, 12);
  ctx.lineTo(10, 12);
  ctx.closePath();
  ctx.fillStyle = cursor.color;
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Name label
  ctx.font = "11px -apple-system, BlinkMacSystemFont, sans-serif";
  const textWidth = ctx.measureText(cursor.userName).width;
  ctx.fillStyle = cursor.color;
  roundRect(ctx, 10, 14, textWidth + 8, 18, 4);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(cursor.userName, 14, 17);

  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
