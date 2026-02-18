"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import type { BoardObject, CursorPosition, ObjectType } from "@/types/board";
import type { Camera } from "@/lib/board-store";
import { screenToWorld as screenToWorldFn, hitTest as hitTestFn } from "@/lib/board-logic";

interface BoardCanvasProps {
  objects: BoardObject[];
  camera: Camera;
  selectedId: string | null;
  editingId: string | null;
  activeTool: ObjectType | "select";
  cursors: Map<string, CursorPosition>;
  onCanvasClick: (worldX: number, worldY: number) => void;
  onObjectSelect: (id: string | null) => void;
  onObjectMove: (id: string, x: number, y: number) => void;
  onObjectDoubleClick: (id: string) => void;
  onPan: (dx: number, dy: number) => void;
  onZoom: (delta: number, cx: number, cy: number) => void;
  onCursorMove: (worldX: number, worldY: number) => void;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function BoardCanvas({
  objects,
  camera,
  selectedId,
  editingId: _editingId,
  activeTool,
  cursors,
  onCanvasClick,
  onObjectSelect,
  onObjectMove,
  onObjectDoubleClick,
  onPan,
  onZoom,
  onCursorMove,
}: BoardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragObjStart, setDragObjStart] = useState({ x: 0, y: 0 });
  const animFrameRef = useRef<number>(0);

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

    // Objects
    for (const obj of objects) {
      drawObject(ctx, obj, obj.id === selectedId);
    }

    // Remote cursors
    for (const [, cursor] of cursors) {
      drawCursor(ctx, cursor);
    }

    ctx.restore();
  }, [objects, camera, selectedId, cursors]);

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

      // Middle mouse or space+click = pan
      if (e.button === 1) {
        setIsPanning(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        e.preventDefault();
        return;
      }

      const hit = hitTest(world.x, world.y);
      if (hit) {
        onObjectSelect(hit.id);
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        setDragObjStart({ x: hit.x, y: hit.y });
      } else {
        if (activeTool === "select") {
          setIsPanning(true);
          setDragStart({ x: e.clientX, y: e.clientY });
        }
        onObjectSelect(null);
      }
    },
    [screenToWorld, hitTest, onObjectSelect, activeTool]
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

      if (isDragging && selectedId) {
        const dx = (e.clientX - dragStart.x) / camera.zoom;
        const dy = (e.clientY - dragStart.y) / camera.zoom;
        onObjectMove(selectedId, dragObjStart.x + dx, dragObjStart.y + dy);
      }
    },
    [
      screenToWorld,
      onCursorMove,
      isPanning,
      isDragging,
      selectedId,
      dragStart,
      dragObjStart,
      camera.zoom,
      onPan,
      onObjectMove,
    ]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging && !isPanning) {
        // Click on empty space with a creation tool
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          const sx = e.clientX - rect.left;
          const sy = e.clientY - rect.top;
          const world = screenToWorld(sx, sy);
          onCanvasClick(world.x, world.y);
        }
      }
      if (isDragging && selectedId) {
        // Persist the final position
        const obj = objects.find((o) => o.id === selectedId);
        if (obj) {
          onObjectMove(selectedId, obj.x, obj.y);
        }
      }
      setIsDragging(false);
      setIsPanning(false);
    },
    [isDragging, isPanning, selectedId, screenToWorld, onCanvasClick, objects, onObjectMove]
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

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setIsDragging(false);
          setIsPanning(false);
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

function drawObject(ctx: CanvasRenderingContext2D, obj: BoardObject, selected: boolean) {
  ctx.save();

  if (obj.type === "circle") {
    ctx.beginPath();
    ctx.ellipse(
      obj.x + obj.width / 2,
      obj.y + obj.height / 2,
      obj.width / 2,
      obj.height / 2,
      0,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = obj.color;
    ctx.fill();
    if (selected) {
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  } else if (obj.type === "sticky_note") {
    // Shadow
    ctx.shadowColor = "rgba(0,0,0,0.1)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = obj.color;
    roundRect(ctx, obj.x, obj.y, obj.width, obj.height, 8);
    ctx.fill();

    ctx.shadowColor = "transparent";

    if (selected) {
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 3;
      roundRect(ctx, obj.x, obj.y, obj.width, obj.height, 8);
      ctx.stroke();
    }

    // Text
    if (obj.content) {
      ctx.fillStyle = "#1a1a1a";
      ctx.font = "14px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      wrapText(ctx, obj.content, obj.x + 12, obj.y + 12, obj.width - 24, 18);
    }
  } else if (obj.type === "rectangle") {
    ctx.fillStyle = obj.color;
    ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
    if (selected) {
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 3;
      ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
    }
  } else {
    ctx.fillStyle = "#1a1a1a";
    ctx.font = "18px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(obj.content || "Text", obj.x, obj.y);
    if (selected) {
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(obj.x - 4, obj.y - 4, obj.width + 8, obj.height + 8);
      ctx.setLineDash([]);
    }
  }

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

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(" ");
  let line = "";
  let currentY = y;

  for (const word of words) {
    const testLine = line + word + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line) {
      ctx.fillText(line.trim(), x, currentY);
      line = word + " ";
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, currentY);
}
