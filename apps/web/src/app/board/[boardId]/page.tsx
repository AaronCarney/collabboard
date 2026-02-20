"use client";

import { useEffect, useCallback, useRef, useMemo, useState } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import type { BoardObject } from "@/types/board";
import { boardObjectSchema } from "@collabboard/shared";
import { showToast } from "@/lib/toast";
import { useBoardStore } from "@/lib/board-store";
import { createBoardKeyHandler } from "@/lib/board-keyboard";
import { createClerkSupabaseClient, createRealtimeClient } from "@/lib/supabase";
import { BoardCanvas } from "@/components/board/BoardCanvas";
import { Sidebar } from "@/components/board/Sidebar";
import { MenuBar } from "@/components/board/MenuBar";
import { AiCommandBar } from "@/components/board/AiCommandBar";
import { PresenceBar } from "@/components/board/PresenceBar";
import { TextEditor } from "@/components/board/TextEditor";
import { PropertyPanel } from "@/components/board/PropertyPanel";
import { ShareDialog } from "@/components/board/ShareDialog";
import { EmptyBoardHint } from "@/components/board/EmptyBoardHint";
import { KeyboardHelpOverlay } from "@/components/board/KeyboardHelpOverlay";
import { BoardContext } from "@/components/board/BoardContext";
import type { BoardContextValue } from "@/components/board/BoardContext";
import { useUndoRedoKeyboard } from "@/hooks/useUndoRedoKeyboard";
import {
  serializeObjectsToClipboard,
  deserializeClipboard,
  createDuplicates,
  createPasteCommand,
  createDuplicateCommand,
} from "@/lib/transforms";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default function BoardPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const params = useParams();
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
  const [boardName, setBoardName] = useState("Untitled Board");
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const clipboardRef = useRef<string>("");

  useEffect(() => {
    if (!user) return;
    void store.loadObjects();
    const cleanup = store.subscribe();
    return cleanup;
  }, [user, store.loadObjects, store.subscribe]);

  // Dynamic document title
  useEffect(() => {
    document.title = `${boardName} | CollabBoard`;
  }, [boardName]);

  // Wire undo/redo keyboard shortcuts
  useUndoRedoKeyboard({
    undo: store.undo,
    redo: store.redo,
    enabled: !store.editingId,
  });

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
      if (store.activeTool !== "select" && store.activeTool !== "pan") {
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
    const count = store.selectedIds.length;
    for (const id of store.selectedIds) {
      void store.deleteObject(id);
    }
    store.setSelectedIds([]);
    if (count > 0) {
      showToast(`Deleted ${String(count)} object(s)`, "info");
    }
  }, [store.selectedIds, store.deleteObject, store.setSelectedIds]);

  const handleUpdateObjects = useCallback(
    (ids: string[], changes: Partial<BoardObject>) => {
      for (const id of ids) {
        store.updateObject(id, changes);
      }
    },
    [store.updateObject]
  );

  // Copy selected objects to internal clipboard
  const handleCopy = useCallback(() => {
    const selected = store.objects.filter((o) => store.selectedIds.includes(o.id));
    if (selected.length > 0) {
      clipboardRef.current = serializeObjectsToClipboard(selected);
      showToast("Copied", "info");
    }
  }, [store.objects, store.selectedIds]);

  // Paste from internal clipboard
  const handlePaste = useCallback(() => {
    if (!clipboardRef.current) return;
    const objects = deserializeClipboard(clipboardRef.current);
    if (objects.length === 0) return;
    const duplicates = createDuplicates(objects);
    const pipeline = store.getPipeline();
    const cmd = createPasteCommand(duplicates, pipeline);
    store.history.execute(cmd);
    store.setSelectedIds(duplicates.map((d) => d.id));
    showToast("Pasted", "info");
  }, [store]);

  // Duplicate selected objects
  const handleDuplicate = useCallback(() => {
    if (store.selectedIds.length === 0) return;
    const pipeline = store.getPipeline();
    const cmd = createDuplicateCommand(store.selectedIds, pipeline);
    store.history.execute(cmd);
    store.setSelectedIds(cmd.createdIds);
  }, [store]);

  // Keyboard handling (including Space for pan)
  useEffect(() => {
    const handleKey = createBoardKeyHandler({
      editingId: store.editingId,
      handleDelete,
      setSelectedIds: store.setSelectedIds,
      setActiveTool: store.setActiveTool,
      objects: store.objects,
      onCopy: handleCopy,
      onPaste: handlePaste,
      onDuplicate: handleDuplicate,
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !store.editingId) {
        e.preventDefault();
        setIsSpaceHeld(true);
        return;
      }
      if (e.key === "?" && !store.editingId) {
        setIsHelpOpen((prev) => !prev);
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
  }, [
    store.editingId,
    handleDelete,
    store.setSelectedIds,
    store.setActiveTool,
    store.objects,
    handleCopy,
    handlePaste,
    handleDuplicate,
  ]);

  const editingObject = store.editingId
    ? store.objects.find((o) => o.id === store.editingId)
    : null;

  const selectedObjects = store.objects.filter((o) => store.selectedIds.includes(o.id));

  const [aiLoading, setAiLoading] = useState(false);
  const [aiResultMessage, setAiResultMessage] = useState<string | undefined>(undefined);

  const handleAiSubmit = useCallback(
    (command: string) => {
      setAiLoading(true);
      setAiResultMessage(undefined);

      fetch("/api/ai/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boardId,
          command,
          context: {
            selectedObjectIds: store.selectedIds.length > 0 ? store.selectedIds : undefined,
            viewportCenter: {
              x: -store.camera.x + window.innerWidth / 2 / store.camera.zoom,
              y: -store.camera.y + window.innerHeight / 2 / store.camera.zoom,
            },
          },
        }),
      })
        .then(async (res) => {
          const data = (await res.json()) as {
            success: boolean;
            objects?: unknown[];
            message?: string;
            error?: string;
            isTemplate?: boolean;
          };

          if (!res.ok || !data.success) {
            const errorMsg = data.error ?? "AI command failed";
            showToast(errorMsg, "error");
            setAiResultMessage(errorMsg);
            return;
          }

          // Validate objects through Zod before merging (consistent with all other ingestion paths)
          const validatedObjects: BoardObject[] = [];
          if (data.objects && data.objects.length > 0) {
            for (const obj of data.objects) {
              const result = boardObjectSchema.safeParse(obj);
              if (result.success) {
                validatedObjects.push(result.data as BoardObject);
              }
            }
            if (validatedObjects.length > 0) {
              store.mergeObjects(validatedObjects);
            }
          }

          const successMsg = data.message ?? `Created ${String(validatedObjects.length)} object(s)`;
          showToast(successMsg, "success");
          setAiResultMessage(successMsg);
        })
        .catch((err: unknown) => {
          const errorMsg = err instanceof Error ? err.message : "Network error";
          showToast(errorMsg, "error");
          setAiResultMessage(errorMsg);
        })
        .finally(() => {
          setAiLoading(false);
        });
    },
    [boardId, store.selectedIds, store.camera, store.mergeObjects]
  );

  // Build BoardContext value
  const boardContextValue: BoardContextValue = useMemo(
    () => ({
      activeTool: store.activeTool,
      setActiveTool: store.setActiveTool,
      selectedIds: new Set(store.selectedIds),
      undo: store.undo,
      redo: store.redo,
      canUndo: store.canUndo,
      canRedo: store.canRedo,
      zoom: store.camera.zoom,
      setZoom: (z: number) => {
        store.setCamera((prev) => ({ ...prev, zoom: z }));
      },
      fitToScreen: () => {
        store.setCamera({ x: 0, y: 0, zoom: 1 });
      },
      deleteSelected: handleDelete,
      duplicateSelected: handleDuplicate,
      copySelected: handleCopy,
      pasteFromClipboard: handlePaste,
    }),
    [
      store.activeTool,
      store.setActiveTool,
      store.selectedIds,
      store.undo,
      store.redo,
      store.canUndo,
      store.canRedo,
      store.camera.zoom,
      store.setCamera,
      handleDelete,
      handleDuplicate,
      handleCopy,
      handlePaste,
    ]
  );

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <BoardContext.Provider value={boardContextValue}>
      <div className="h-screen w-screen overflow-hidden relative bg-gray-50">
        {/* Top Menu Bar */}
        <MenuBar
          boardName={boardName}
          onBoardNameChange={setBoardName}
          onShareClick={() => {
            setIsShareOpen(true);
          }}
          onShowShortcuts={() => {
            setIsHelpOpen(true);
          }}
        />

        {/* Left Sidebar */}
        <Sidebar />

        {/* Collaborator Presence — repositioned below menu bar */}
        <PresenceBar users={store.presenceUsers} currentUserId={user.id} />

        {/* Canvas */}
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

        {/* Property Panel */}
        {selectedObjects.length > 0 && !editingObject && (
          <PropertyPanel selectedObjects={selectedObjects} onUpdateObjects={handleUpdateObjects} />
        )}

        {/* Text Editor Overlay */}
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

        {/* AI Command Bar */}
        <AiCommandBar
          onSubmit={handleAiSubmit}
          isLoading={aiLoading}
          resultPreview={aiResultMessage}
        />

        {/* Empty Board Onboarding */}
        {store.objects.length === 0 && !store.editingId && <EmptyBoardHint />}

        {/* Keyboard Shortcut Help */}
        <KeyboardHelpOverlay
          isOpen={isHelpOpen}
          onClose={() => {
            setIsHelpOpen(false);
          }}
        />

        {/* Share Dialog */}
        <ShareDialog
          boardId={boardId}
          isOpen={isShareOpen}
          onClose={() => {
            setIsShareOpen(false);
          }}
        />
      </div>
    </BoardContext.Provider>
  );
}
