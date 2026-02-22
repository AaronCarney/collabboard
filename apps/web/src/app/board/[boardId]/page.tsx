"use client";

import { useEffect, useCallback, useRef, useMemo, useState } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { BoardObject } from "@/types/board";
import type { ToolType, PortName, ObjectType } from "@collabboard/shared";
import { boardObjectSchema, OBJECT_DEFAULTS } from "@collabboard/shared";
import { showToast } from "@/lib/toast";
import { computeFitToScreen } from "@/lib/view-controls";
import {
  createLineObject,
  createLineObjectQuickClick,
  createConnectorObject,
  computeDragBounds,
} from "@/lib/canvas-drawing-utils";
import { findContainingFrame } from "@/lib/frame-containment";
import { exportBoardAsPng } from "@/lib/export-png";
import { validateShareToken, isReadOnlyAccess } from "@/lib/share-access";
import { getZoomSensitivity } from "@/lib/zoom-speed";
import { useBoardStore } from "@/lib/board-store";
import { createBoardKeyHandler, isTextInputFocused } from "@/lib/board-keyboard";
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

  const searchParams = useSearchParams();
  const shareToken = searchParams.get("share");

  // Space key tracking for pan
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  const [boardName, setBoardName] = useState("Untitled Board");
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [aiBarVisible, setAiBarVisible] = useState(true);
  const [gridVisible, setGridVisible] = useState(true);
  const [shareAccessLevel, setShareAccessLevel] = useState<"view" | "edit" | null>(
    shareToken ? "view" : null
  );
  const readOnly = isReadOnlyAccess(shareAccessLevel);
  const [hintDismissed, setHintDismissed] = useState(
    () =>
      typeof window !== "undefined" &&
      localStorage.getItem(`collabboard:hint-dismissed:${boardId}`) === "true"
  );
  const clipboardRef = useRef<string>("");

  // Load board name from DB on mount
  useEffect(() => {
    if (!user) return;
    const loadBoard = async (): Promise<void> => {
      try {
        const result = await supabase.from("boards").select("name").eq("id", boardId).single();
        if (result.error ?? !result.data) {
          showToast("Board not found", "error");
          router.push("/dashboard");
          return;
        }
        setBoardName((result.data as { name: string }).name);
      } catch {
        showToast("Failed to load board", "error");
        router.push("/dashboard");
      }
    };
    void loadBoard();
  }, [user, supabase, boardId, router]);

  // Validate share token if present
  useEffect(() => {
    if (!shareToken) return;
    void validateShareToken(shareToken, fetch).then((result) => {
      if (result.valid && result.boardId === boardId) {
        setShareAccessLevel(result.accessLevel);
      } else {
        showToast("Invalid or expired share link", "error");
        router.push("/dashboard");
      }
    });
  }, [shareToken, boardId, router]);

  // Save board name to DB (called on blur/Enter from MenuBar)
  const handleBoardNameChange = useCallback(
    (name: string) => {
      if (readOnly) return;
      const sanitized = name
        .trim()
        .split("")
        .filter((ch) => {
          const code = ch.charCodeAt(0);
          return code >= 0x20 && code !== 0x7f;
        })
        .join("")
        .slice(0, 100);
      if (!sanitized) return;
      setBoardName(sanitized);
      void supabase
        .from("boards")
        .update({ name: sanitized })
        .eq("id", boardId)
        .then(({ error }: { error: unknown }) => {
          if (error) {
            showToast("Failed to save board name", "error");
          }
        });
    },
    [supabase, boardId, readOnly]
  );

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
    enabled: !store.editingId && !readOnly,
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

  const handleDismissHint = useCallback(() => {
    setHintDismissed(true);
    localStorage.setItem(`collabboard:hint-dismissed:${boardId}`, "true");
  }, [boardId]);

  const handleCanvasClick = useCallback(
    (wx: number, wy: number) => {
      if (readOnly) return;
      // Canvas click is now only a fallback — drawing tools go through handleDrawCreate
      if (
        store.activeTool !== "select" &&
        store.activeTool !== "pan" &&
        store.activeTool !== "connector" &&
        store.activeTool !== "line"
      ) {
        void store.createObject(store.activeTool, wx, wy).then((newObj) => {
          const containingFrame = findContainingFrame(newObj, store.objects);
          if (containingFrame) {
            store.updateObject(newObj.id, { parent_frame_id: containingFrame.id });
          }
        });
        store.setActiveTool("select");
      }
    },
    [
      store.activeTool,
      store.createObject,
      store.setActiveTool,
      store.objects,
      store.updateObject,
      readOnly,
    ]
  );

  const handleDrawCreate = useCallback(
    (tool: ToolType, startX: number, startY: number, endX: number, endY: number) => {
      if (readOnly) return;
      const userId = user?.id ?? "";

      if (tool === "line") {
        const dx = endX - startX;
        const dy = endY - startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const lineObj =
          dist < 5
            ? createLineObjectQuickClick({ x: startX, y: startY, boardId, userId })
            : createLineObject({ startX, startY, endX, endY, boardId, userId });
        store.mutate([lineObj]);
      } else if (tool !== "select" && tool !== "pan" && tool !== "connector") {
        // Shape tools: compute drag bounds
        const objectType: ObjectType = tool;
        const toolDefaults = OBJECT_DEFAULTS[objectType];
        const defaultW = typeof toolDefaults.width === "number" ? toolDefaults.width : 200;
        const defaultH = typeof toolDefaults.height === "number" ? toolDefaults.height : 150;
        const bounds = computeDragBounds({
          startX,
          startY,
          endX,
          endY,
          defaults: { width: defaultW, height: defaultH },
        });
        void store
          .createObject(objectType, bounds.x, bounds.y, bounds.width, bounds.height)
          .then((newObj) => {
            const containingFrame = findContainingFrame(newObj, store.objects);
            if (containingFrame) {
              store.updateObject(newObj.id, { parent_frame_id: containingFrame.id });
            }
          });
      }
      store.setActiveTool("select");
    },
    [
      boardId,
      user?.id,
      store.mutate,
      store.createObject,
      store.setActiveTool,
      store.objects,
      store.updateObject,
      readOnly,
    ]
  );

  const handleConnectorCreate = useCallback(
    (sourceId: string, sourcePort: PortName, targetId: string, targetPort: PortName) => {
      if (readOnly) return;
      const userId = user?.id ?? "";
      const connectorObj = createConnectorObject({
        sourceId,
        sourcePort,
        targetId,
        targetPort,
        boardId,
        userId,
      });
      store.mutate([connectorObj]);
      store.setActiveTool("select");
    },
    [boardId, user?.id, store.mutate, store.setActiveTool, readOnly]
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
      if (readOnly) return;
      const obj = store.objects.find((o) => o.id === id);
      if (obj && (obj.type === "sticky_note" || obj.type === "text")) {
        store.setEditingId(id);
      }
    },
    [store.objects, store.setEditingId, readOnly]
  );

  const handleObjectsMove = useCallback(
    (moves: { id: string; x: number; y: number }[], persist?: boolean) => {
      if (readOnly) return;

      // If moving a frame, also move its children
      const allMoves = [...moves];
      const movingIds = new Set(allMoves.map((m) => m.id));
      for (const move of moves) {
        const obj = store.objects.find((o) => o.id === move.id);
        if (obj?.type === "frame") {
          const originalFrame = store.objects.find((o) => o.id === move.id);
          if (originalFrame) {
            const dx = move.x - originalFrame.x;
            const dy = move.y - originalFrame.y;
            const children = store.objects.filter((o) => o.parent_frame_id === move.id);
            for (const child of children) {
              if (!movingIds.has(child.id)) {
                movingIds.add(child.id);
                allMoves.push({ id: child.id, x: child.x + dx, y: child.y + dy });
              }
            }
          }
        }
      }

      store.moveObjects(allMoves, persist);

      // On persist (mouseup), re-check containment for non-frame objects
      if (persist) {
        for (const move of allMoves) {
          const movedObj = store.objects.find((o) => o.id === move.id);
          if (movedObj && movedObj.type !== "frame") {
            const updatedObj = { ...movedObj, x: move.x, y: move.y };
            const frame = findContainingFrame(updatedObj, store.objects);
            const newFrameId = frame?.id ?? null;
            if (newFrameId !== movedObj.parent_frame_id) {
              store.updateObject(movedObj.id, { parent_frame_id: newFrameId });
            }
          }
        }
      }
    },
    [store.moveObjects, store.objects, store.updateObject, readOnly]
  );

  const handleDoubleClick = useCallback(
    (id: string) => {
      if (readOnly) return;
      const obj = store.objects.find((o) => o.id === id);
      if (obj && (obj.type === "sticky_note" || obj.type === "text")) {
        store.setEditingId(id);
      }
    },
    [store.objects, store.setEditingId, readOnly]
  );

  const handleSelectionBox = useCallback(
    (ids: string[]) => {
      store.setSelectedIds(ids);
    },
    [store.setSelectedIds]
  );

  const handleObjectResize = useCallback(
    (id: string, bounds: { x: number; y: number; width: number; height: number }) => {
      if (readOnly) return;
      store.updateObject(id, bounds);
    },
    [store.updateObject, readOnly]
  );

  const handleTextSave = useCallback(
    (id: string, content: string) => {
      if (readOnly) return;
      store.updateObject(id, { content });
    },
    [store.updateObject, readOnly]
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
        // Exponential zoom: magnitude-aware for smooth trackpad/pinch support.
        // delta > 0 means zoom in (scroll up), delta < 0 means zoom out.
        const sensitivity = getZoomSensitivity();
        const factor = Math.exp(delta * sensitivity);
        const newZoom = Math.max(0.02, Math.min(20, prev.zoom * factor));
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
    if (readOnly) return;
    const count = store.selectedIds.length;
    for (const id of store.selectedIds) {
      void store.deleteObject(id);
    }
    store.setSelectedIds([]);
    if (count > 0) {
      showToast(`Deleted ${String(count)} object(s)`, "info");
    }
  }, [store.selectedIds, store.deleteObject, store.setSelectedIds, readOnly]);

  const handleUpdateObjects = useCallback(
    (ids: string[], changes: Partial<BoardObject>) => {
      if (readOnly) return;
      for (const id of ids) {
        store.updateObject(id, changes);
      }
    },
    [store.updateObject, readOnly]
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
    if (readOnly) return;
    if (!clipboardRef.current) return;
    const objects = deserializeClipboard(clipboardRef.current);
    if (objects.length === 0) return;
    const duplicates = createDuplicates(objects);
    const pipeline = store.getPipeline();
    const cmd = createPasteCommand(duplicates, pipeline);
    store.history.execute(cmd);
    store.setSelectedIds(duplicates.map((d) => d.id));
    showToast("Pasted", "info");
  }, [store, readOnly]);

  // Duplicate selected objects
  const handleDuplicate = useCallback(() => {
    if (readOnly) return;
    if (store.selectedIds.length === 0) return;
    const pipeline = store.getPipeline();
    const cmd = createDuplicateCommand(store.selectedIds, pipeline);
    store.history.execute(cmd);
    store.setSelectedIds(cmd.createdIds);
  }, [store, readOnly]);

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
      onToggleAiBar: () => {
        setAiBarVisible((prev) => !prev);
      },
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !store.editingId && !isTextInputFocused()) {
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
    setAiBarVisible,
  ]);

  const editingObject = store.editingId
    ? store.objects.find((o) => o.id === store.editingId)
    : null;

  const selectedObjects = store.objects.filter((o) => store.selectedIds.includes(o.id));

  const [aiLoading, setAiLoading] = useState(false);
  const [aiResultMessage, setAiResultMessage] = useState<string | undefined>(undefined);

  const handleAiSubmit = useCallback(
    (command: string) => {
      if (readOnly) return;
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
                validatedObjects.push(result.data);
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
    [boardId, store.selectedIds, store.camera, store.mergeObjects, readOnly]
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
        const canvas = document.querySelector("canvas");
        const vw = canvas?.clientWidth ?? window.innerWidth;
        const vh = canvas?.clientHeight ?? window.innerHeight;
        const cam = computeFitToScreen(store.objects, vw, vh);
        store.setCamera(cam);
      },
      deleteSelected: handleDelete,
      duplicateSelected: handleDuplicate,
      copySelected: handleCopy,
      pasteFromClipboard: handlePaste,
      gridVisible,
      toggleGrid: () => {
        setGridVisible((prev) => !prev);
      },
      readOnly,
      exportPNG: () => {
        exportBoardAsPng(store.objects, boardName);
      },
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
      store.objects,
      handleDelete,
      handleDuplicate,
      handleCopy,
      handlePaste,
      gridVisible,
      readOnly,
      boardName,
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
          onBoardNameChange={handleBoardNameChange}
          onShareClick={() => {
            setIsShareOpen(true);
          }}
          onShowShortcuts={() => {
            setIsHelpOpen(true);
          }}
        />

        {/* Left Sidebar — hidden for read-only viewers */}
        {!readOnly && <Sidebar />}

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
          gridVisible={gridVisible}
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
          onDrawCreate={handleDrawCreate}
          onConnectorCreate={handleConnectorCreate}
        />

        {/* Property Panel — hidden for read-only viewers */}
        {!readOnly && selectedObjects.length > 0 && !editingObject && (
          <PropertyPanel selectedObjects={selectedObjects} onUpdateObjects={handleUpdateObjects} />
        )}

        {/* Text Editor Overlay — hidden for read-only viewers */}
        {!readOnly && editingObject && (
          <TextEditor
            object={editingObject}
            camera={store.camera}
            onSave={handleTextSave}
            onClose={() => {
              store.setEditingId(null);
            }}
          />
        )}

        {/* AI Command Bar — hidden for read-only viewers */}
        {aiBarVisible && !readOnly && (
          <AiCommandBar
            onSubmit={handleAiSubmit}
            isLoading={aiLoading}
            resultPreview={aiResultMessage}
            onClose={() => {
              setAiBarVisible(false);
            }}
          />
        )}

        {/* Empty Board Onboarding */}
        {store.objects.length === 0 && !store.editingId && !hintDismissed && (
          <EmptyBoardHint boardId={boardId} onDismiss={handleDismissHint} />
        )}

        {/* Keyboard Shortcut Help */}
        <KeyboardHelpOverlay
          isOpen={isHelpOpen}
          onClose={() => {
            setIsHelpOpen(false);
          }}
        />

        {/* Share Dialog — hidden for read-only viewers */}
        {!readOnly && (
          <ShareDialog
            boardId={boardId}
            isOpen={isShareOpen}
            onClose={() => {
              setIsShareOpen(false);
            }}
          />
        )}
      </div>
    </BoardContext.Provider>
  );
}
