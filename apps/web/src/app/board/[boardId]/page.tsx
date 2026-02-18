"use client";

import { useEffect, useCallback, useRef, useMemo } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import { useBoardStore } from "@/lib/board-store";
import { createBoardKeyHandler } from "@/lib/board-keyboard";
import { createClerkSupabaseClient, createRealtimeClient } from "@/lib/supabase";
import { BoardCanvas } from "@/components/board/BoardCanvas";
import { ToolBar } from "@/components/board/ToolBar";
import { PresenceBar } from "@/components/board/PresenceBar";
import { TextEditor } from "@/components/board/TextEditor";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default function BoardPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const params = useParams();
  const router = useRouter();
  const boardId = params.boardId as string;
  // Use a ref so the Supabase client's accessToken callback always calls
  // the latest getToken without recreating the client (and its WebSocket).
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

  const handleObjectMove = useCallback(
    (id: string, x: number, y: number) => {
      store.updateObject(id, { x, y });
    },
    [store.updateObject]
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
    if (store.selectedId) {
      void store.deleteObject(store.selectedId);
      store.setSelectedId(null);
    }
  }, [store.selectedId, store.deleteObject, store.setSelectedId]);

  useEffect(() => {
    const handleKey = createBoardKeyHandler({
      editingId: store.editingId,
      handleDelete,
      setSelectedId: store.setSelectedId,
      setActiveTool: store.setActiveTool,
    });
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
    };
  }, [store.editingId, handleDelete, store.setSelectedId, store.setActiveTool]);

  const editingObject = store.editingId
    ? store.objects.find((o) => o.id === store.editingId)
    : null;

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
        hasSelection={!!store.selectedId}
      />

      <PresenceBar users={store.presenceUsers} currentUserId={user.id} />

      <div className="absolute bottom-4 left-4 z-50 bg-white rounded-lg px-3 py-1.5 shadow-sm border text-sm text-gray-600">
        {Math.round(store.camera.zoom * 100)}%
      </div>

      <BoardCanvas
        objects={store.objects}
        camera={store.camera}
        selectedId={store.selectedId}
        editingId={store.editingId}
        activeTool={store.activeTool}
        cursors={store.cursors}
        onCanvasClick={handleCanvasClick}
        onObjectSelect={store.setSelectedId}
        onObjectMove={handleObjectMove}
        onObjectDoubleClick={handleDoubleClick}
        onPan={handlePan}
        onZoom={handleZoom}
        onCursorMove={handleCursorMove}
      />

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
