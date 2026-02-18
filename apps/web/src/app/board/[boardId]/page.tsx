"use client";

import { useEffect, useCallback, useRef, useMemo, useState } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import type { BoardObject } from "@/types/board";
import { useBoardStore } from "@/lib/board-store";
import { createBoardKeyHandler } from "@/lib/board-keyboard";
import { createClerkSupabaseClient, createRealtimeClient } from "@/lib/supabase";
import { BoardCanvas } from "@/components/board/BoardCanvas";
import { ToolBar } from "@/components/board/ToolBar";
import { PresenceBar } from "@/components/board/PresenceBar";
import { TextEditor } from "@/components/board/TextEditor";
import { PropertyPanel } from "@/components/board/PropertyPanel";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default function BoardPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const params = useParams();
  const router = useRouter();
  const boardId = params.boardId as string;
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const supabase = useMemo(() => createClerkSupabaseClient(() => getTokenRef.current()), []);
  const realtimeSupabase = useMemo(() => createRealtimeClient(), []);

  const store = useBoardStore(
    boardId,
    user?.id ?? "",
    user?.fullName ?? user?.username ?? "Anonymous",
    supabase,
    realtimeSupabase
  );

  // Space key tracking for pan
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);

  useEffect(() => {
    if (!user) return;
    void store.loadObjects();
    const cleanup = store.subscribe();
    return cleanup;
  }, [user, store.loadObjects, store.subscribe]);

  const lastCursorRef = useRef(0);
  const handleCursorMove = useCallback(
    (wx: number, wy: number) => {
      const now = Date.now();
      if (now - lastCursorRef.current > 50) {
        lastCursorRef.current = now;
        store.broadcastCursor(wx, wy);
      }
    },
    [store.broadcastCursor]
  );

  const handleCanvasClick = useCallback(
    (wx: number, wy: number) => {
      if (store.activeTool !== "select") {
        void store.createObject(store.activeTool, wx, wy);
        store.setActiveTool("select");
      }
    },
    [store.activeTool, store.createObject, store.setActiveTool]
  );

  const handleObjectSelect = useCallback(
    (id: string | null, additive: boolean) => {
      if (id === null) {
        store.setSelectedIds([]);
        return;
      }
      if (additive) {
        store.setSelectedIds((prev) => {
          if (prev.includes(id)) {
            return prev.filter((i) => i !== id);
          }
          return [...prev, id];
        });
      } else {
        store.setSelectedIds([id]);
      }
    },
    [store.setSelectedIds]
  );

  const handleObjectClick = useCallback(
    (id: string) => {
      const obj = store.objects.find((o) => o.id === id);
      if (obj && (obj.type === "sticky_note" || obj.type === "text")) {
        store.setEditingId(id);
      }
    },
    [store.objects, store.setEditingId]
  );

  const handleObjectsMove = useCallback(
    (moves: { id: string; x: number; y: number }[], persist?: boolean) => {
      store.moveObjects(moves, persist);
    },
    [store.moveObjects]
  );

  const handleDoubleClick = useCallback(
    (id: string) => {
      const obj = store.objects.find((o) => o.id === id);
      if (obj && (obj.type === "sticky_note" || obj.type === "text")) {
        store.setEditingId(id);
      }
    },
    [store.objects, store.setEditingId]
  );

  const handleSelectionBox = useCallback(
    (ids: string[]) => {
      store.setSelectedIds(ids);
    },
    [store.setSelectedIds]
  );

  const handleObjectResize = useCallback(
    (id: string, bounds: { x: number; y: number; width: number; height: number }) => {
      store.updateObject(id, bounds);
    },
    [store.updateObject]
  );

  const handleTextSave = useCallback(
    (id: string, content: string) => {
      store.updateObject(id, { content });
    },
    [store.updateObject]
  );

  const handlePan = useCallback(
    (dx: number, dy: number) => {
      store.setCamera((prev) => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy,
      }));
    },
    [store.setCamera]
  );

  const handleZoom = useCallback(
    (delta: number, cx: number, cy: number) => {
      store.setCamera((prev) => {
        const newZoom = Math.max(0.1, Math.min(5, prev.zoom + delta));
        const scale = newZoom / prev.zoom;
        return {
          x: cx - (cx - prev.x) * scale,
          y: cy - (cy - prev.y) * scale,
          zoom: newZoom,
        };
      });
    },
    [store.setCamera]
  );

  const handleDelete = useCallback(() => {
    for (const id of store.selectedIds) {
      void store.deleteObject(id);
    }
    store.setSelectedIds([]);
  }, [store.selectedIds, store.deleteObject, store.setSelectedIds]);

  const handleUpdateObjects = useCallback(
    (ids: string[], changes: Partial<BoardObject>) => {
      for (const id of ids) {
        store.updateObject(id, changes);
      }
    },
    [store.updateObject]
  );

  // Keyboard handling (including Space for pan)
  useEffect(() => {
    const handleKey = createBoardKeyHandler({
      editingId: store.editingId,
      handleDelete,
      setSelectedIds: store.setSelectedIds,
      setActiveTool: store.setActiveTool,
      objects: store.objects,
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !store.editingId) {
        e.preventDefault();
        setIsSpaceHeld(true);
        return;
      }
      handleKey(e);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpaceHeld(false);
      }
    };

    const handleBlur = () => {
      setIsSpaceHeld(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [store.editingId, handleDelete, store.setSelectedIds, store.setActiveTool, store.objects]);

  const editingObject = store.editingId
    ? store.objects.find((o) => o.id === store.editingId)
    : null;

  const selectedObjects = store.objects.filter((o) => store.selectedIds.includes(o.id));

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden relative bg-gray-100">
      <div className="absolute top-4 left-4 z-50 flex items-center gap-2">
        <button
          onClick={() => {
            router.push("/dashboard");
          }}
          className="bg-white rounded-lg px-3 py-1.5 shadow-sm border text-sm font-medium hover:bg-gray-50"
        >
          &larr; Back
        </button>
      </div>

      <ToolBar
        activeTool={store.activeTool}
        onToolChange={store.setActiveTool}
        onDelete={handleDelete}
        hasSelection={store.selectedIds.length > 0}
      />

      <PresenceBar users={store.presenceUsers} currentUserId={user.id} />

      <div className="absolute bottom-4 left-4 z-50 bg-white rounded-lg px-3 py-1.5 shadow-sm border text-sm text-gray-600">
        {Math.round(store.camera.zoom * 100)}%
      </div>

      <BoardCanvas
        objects={store.objects}
        camera={store.camera}
        selectedIds={store.selectedIds}
        editingId={store.editingId}
        activeTool={store.activeTool}
        isSpaceHeld={isSpaceHeld}
        cursors={store.cursors}
        onCanvasClick={handleCanvasClick}
        onObjectSelect={handleObjectSelect}
        onObjectClick={handleObjectClick}
        onObjectsMove={handleObjectsMove}
        onObjectDoubleClick={handleDoubleClick}
        onSelectionBox={handleSelectionBox}
        onObjectResize={handleObjectResize}
        onPan={handlePan}
        onZoom={handleZoom}
        onCursorMove={handleCursorMove}
      />

      {selectedObjects.length > 0 && !editingObject && (
        <PropertyPanel selectedObjects={selectedObjects} onUpdateObjects={handleUpdateObjects} />
      )}

      {editingObject && (
        <TextEditor
          object={editingObject}
          camera={store.camera}
          onSave={handleTextSave}
          onClose={() => {
            store.setEditingId(null);
          }}
        />
      )}
    </div>
  );
}
