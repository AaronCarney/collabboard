"use client";

import type React from "react";
import { useState, useCallback, useRef, useMemo } from "react";
import type { BoardObject, ObjectType, CursorPosition, PresenceUser } from "@/types/board";
import type { ToolType } from "@collabboard/shared";
import { OBJECT_DEFAULTS, USER_COLORS } from "@/types/board";
import { boardObjectSchema } from "@collabboard/shared";
import { v4 as uuidv4 } from "uuid";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { TablesInsert, TablesUpdate } from "@/types/database";
import { hashCode, shouldAcceptUpdate } from "@/lib/board-logic";
import { createCommandHistory } from "@/lib/board-commands";
import type { CommandHistory, MutationPipeline } from "@/lib/board-commands";

export interface UseBoardStoreReturn {
  objects: BoardObject[];
  camera: Camera;
  setCamera: React.Dispatch<React.SetStateAction<Camera>>;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  activeTool: ToolType;
  setActiveTool: React.Dispatch<React.SetStateAction<ToolType>>;
  cursors: Map<string, CursorPosition>;
  presenceUsers: PresenceUser[];
  editingId: string | null;
  setEditingId: React.Dispatch<React.SetStateAction<string | null>>;
  loadObjects: () => Promise<void>;
  subscribe: () => () => void;
  broadcastCursor: (x: number, y: number) => void;
  createObject: (
    type: ObjectType,
    x: number,
    y: number,
    width?: number,
    height?: number
  ) => Promise<BoardObject>;
  updateObject: (id: string, changes: Partial<BoardObject>) => void;
  moveObjects: (moves: { id: string; x: number; y: number }[], persist?: boolean) => void;
  deleteObject: (id: string) => Promise<void>;
  userColor: string;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  history: CommandHistory;
  mutate: (updatedObjects: BoardObject[]) => void;
  mutateRemove: (ids: string[]) => void;
  getPipeline: () => MutationPipeline;
  mergeObjects: (objs: BoardObject[]) => void;
}

const DEBUG_REALTIME = process.env.NEXT_PUBLIC_DEBUG_REALTIME === "true";

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

interface BroadcastPayload {
  id: string;
  board_id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  content: string;
  color: string;
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  parent_frame_id: string | null;
  properties: Record<string, unknown>;
  _source?: string;
}

interface CursorPayload {
  userId: string;
  userName: string;
  x: number;
  y: number;
  color: string;
}

interface DeletePayload {
  id: string;
}

/**
 * Type-safe spread for BoardObject: merges base-field updates into any variant
 * without losing the discriminated union narrowing. Only accepts updates to
 * base fields (not `type` or `properties`) to preserve the discriminant.
 */
function updateBoardObject<T extends BoardObject>(
  obj: T,
  updates: Partial<Omit<BoardObject, "type" | "properties">>
): T {
  return { ...obj, ...updates };
}

/**
 * Merges partial changes (which may include any BoardObject field) into an
 * existing BoardObject. Preserves the variant type since the discriminant
 * (`type`) is carried through from the original object unless explicitly
 * overridden — but callers never override `type` in practice.
 */
function mergeBoardObjectChanges<T extends BoardObject>(
  obj: T,
  changes: Partial<BoardObject>,
  extra: { version: number; updated_at: string }
): T {
  return { ...obj, ...changes, ...extra } as T;
}

/** Base fields shared by all simple (non-connector, non-line) BoardObject variants. */
interface SimpleObjectFields {
  id: string;
  board_id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  content: string;
  color: string;
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  parent_frame_id: string | null;
  properties: Record<string, never>;
}

/**
 * Type-safe factory for BoardObject variants with empty properties.
 * Uses a switch to produce the correct discriminated union member.
 */
function createSimpleBoardObject(type: ObjectType, fields: SimpleObjectFields): BoardObject {
  switch (type) {
    case "sticky_note":
      return { ...fields, type: "sticky_note" };
    case "rectangle":
      return { ...fields, type: "rectangle" };
    case "circle":
      return { ...fields, type: "circle" };
    case "text":
      return { ...fields, type: "text" };
    case "frame":
      return { ...fields, type: "frame" };
    case "triangle":
      return { ...fields, type: "triangle" };
    case "star":
      return { ...fields, type: "star" };
    case "line":
      return {
        ...fields,
        type: "line",
        properties: { x2: 0, y2: 0, arrow_style: "none", stroke_style: "solid", stroke_width: 2 },
      };
    case "connector":
      return {
        ...fields,
        type: "connector",
        properties: {
          from_object_id: "",
          to_object_id: "",
          from_port: "center",
          to_port: "center",
          arrow_style: "end",
          stroke_style: "solid",
        },
      };
  }
}

/**
 * Validate an array of raw objects against the boardObjectSchema.
 * Returns only the objects that pass validation; logs warnings for invalid ones.
 */
function validateBoardObjects(raw: unknown[]): BoardObject[] {
  const valid: BoardObject[] = [];
  for (const item of raw) {
    const result = boardObjectSchema.safeParse(item);
    if (result.success) {
      valid.push(result.data);
    } else if (DEBUG_REALTIME) {
      console.warn("[Zod] rejected board object:", result.error.issues); // eslint-disable-line no-console
    }
  }
  return valid;
}

/**
 * Validate a single broadcast payload.
 * Returns the validated BoardObject or null if invalid.
 */
function validateBroadcastPayload(payload: unknown): BoardObject | null {
  const result = boardObjectSchema.safeParse(payload);
  if (result.success) {
    return result.data;
  }
  if (DEBUG_REALTIME) {
    console.warn("[Zod] rejected broadcast payload:", result.error.issues); // eslint-disable-line no-console
  }
  return null;
}

export function useBoardStore(
  boardId: string,
  userId: string,
  userName: string,
  supabase: SupabaseClient<Database>,
  realtimeSupabase: SupabaseClient<Database>
): UseBoardStoreReturn {
  const [objectsMap, setObjectsMapRaw] = useState<Map<string, BoardObject>>(new Map());
  const objectsMapRef = useRef<Map<string, BoardObject>>(new Map());
  const setObjectsMap = useCallback(
    (
      updater:
        | Map<string, BoardObject>
        | ((prev: Map<string, BoardObject>) => Map<string, BoardObject>)
    ) => {
      setObjectsMapRaw((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        objectsMapRef.current = next;
        return next;
      });
    },
    []
  );
  const objects = useMemo(() => Array.from(objectsMap.values()), [objectsMap]);
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTool, setActiveTool] = useState<ToolType>("select");
  const [cursors, setCursors] = useState<Map<string, CursorPosition>>(new Map());
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof realtimeSupabase.channel> | null>(null);
  const subscribedRef = useRef(false);
  const historyRef = useRef<CommandHistory>(createCommandHistory());
  const broadcastThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBroadcastTimeRef = useRef(0);
  const [historyVersion, setHistoryVersion] = useState(0);

  const userColor = USER_COLORS[Math.abs(hashCode(userId)) % USER_COLORS.length];

  // ─── Mutation Pipeline ─────────────────────────────────────
  // Unified path: optimistic local update → broadcast → persist
  const mutate = useCallback(
    (updatedObjects: BoardObject[]) => {
      setObjectsMap((prev) => {
        const next = new Map(prev);
        for (const obj of updatedObjects) {
          next.set(obj.id, obj);
        }
        return next;
      });

      // Broadcast to peers
      if (subscribedRef.current) {
        for (const obj of updatedObjects) {
          channelRef.current
            ?.send({
              type: "broadcast",
              event: "object:upsert",
              payload: { ...obj, _source: userId },
            })
            .catch((err: unknown) => {
              console.warn("[Broadcast] upsert send failed:", err); // eslint-disable-line no-console
            });
        }
      }

      // Persist to Supabase (fire-and-forget)
      for (const obj of updatedObjects) {
        void supabase
          .from("board_objects")
          .upsert(obj as unknown as TablesInsert<"board_objects">)
          .then(({ error }) => {
            if (error) {
              console.warn("[Supabase] upsert error:", error.message); // eslint-disable-line no-console
            }
          });
      }
    },
    [userId, supabase]
  );

  const mutateRemove = useCallback(
    (ids: string[]) => {
      setObjectsMap((prev) => {
        const next = new Map(prev);
        for (const id of ids) {
          next.delete(id);
        }
        return next;
      });

      if (subscribedRef.current) {
        for (const id of ids) {
          channelRef.current
            ?.send({
              type: "broadcast",
              event: "object:delete",
              payload: { id },
            })
            .catch((err: unknown) => {
              console.warn("[Broadcast] delete send failed:", err); // eslint-disable-line no-console
            });
        }
      }

      for (const id of ids) {
        void supabase
          .from("board_objects")
          .delete()
          .eq("id", id)
          .then(({ error }) => {
            if (error) {
              console.warn("[Supabase] delete error:", error.message); // eslint-disable-line no-console
            }
          });
      }
    },
    [supabase]
  );

  // MutationPipeline adapter for command pattern
  const getPipeline = useCallback((): MutationPipeline => {
    return {
      upsertObjects(objs: BoardObject[]) {
        mutate(objs);
      },
      removeObjects(ids: string[]) {
        mutateRemove(ids);
      },
      getObject(id: string) {
        return objectsMapRef.current.get(id) ?? null;
      },
    };
  }, [mutate, mutateRemove]);

  // ─── History (undo/redo) ───────────────────────────────────

  const history = historyRef.current;

  const undo = useCallback(() => {
    history.undo();
    setHistoryVersion((v) => v + 1);
  }, [history]);

  const redo = useCallback(() => {
    history.redo();
    setHistoryVersion((v) => v + 1);
  }, [history]);

  const canUndo = historyVersion >= 0 && history.canUndo();
  const canRedo = historyVersion >= 0 && history.canRedo();

  // ─── Load + Subscribe ──────────────────────────────────────

  const loadObjects = useCallback(async () => {
    const { data, error } = await supabase
      .from("board_objects")
      .select("*")
      .eq("board_id", boardId);
    if (error) {
      console.warn("[Supabase] loadObjects error:", error.message); // eslint-disable-line no-console
      return;
    }
    const validated = validateBoardObjects(data);
    const map = new Map<string, BoardObject>();
    for (const obj of validated) {
      map.set(obj.id, obj);
    }
    setObjectsMap(map);
  }, [boardId, supabase]);

  const subscribe = useCallback(() => {
    if (DEBUG_REALTIME)
      console.log("[Realtime] creating channel", `board:${boardId}`, "userId:", userId); // eslint-disable-line no-console
    const channel = realtimeSupabase.channel(`board:${boardId}`, {
      config: { presence: { key: userId } },
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<{ userName: string; color: string; onlineAt: string }>();
      if (DEBUG_REALTIME) console.log("[Realtime] presence sync, users:", Object.keys(state)); // eslint-disable-line no-console
      const users: PresenceUser[] = [];
      for (const [uid, presences] of Object.entries(state)) {
        const first = presences[0];
        users.push({
          userId: uid,
          userName: first.userName,
          color: first.color,
          onlineAt: first.onlineAt,
        });
      }
      setPresenceUsers(users);
    });

    channel.on("broadcast", { event: "cursor" }, ({ payload }) => {
      const p = payload as CursorPayload;
      if (p.userId !== userId) {
        setCursors((prev) => {
          const next = new Map(prev);
          next.set(p.userId, p);
          return next;
        });
      }
    });

    channel.on("broadcast", { event: "object:upsert" }, ({ payload }) => {
      const p = payload as BroadcastPayload;
      if (p._source !== userId) {
        // Validate incoming broadcast payload with Zod
        const { _source, ...withoutSource } = p;
        const validated = validateBroadcastPayload(withoutSource);
        if (!validated) return; // reject malformed data

        setObjectsMap((prev) => {
          const existing = prev.get(validated.id);
          if (existing) {
            if (shouldAcceptUpdate(validated.version, existing.version)) {
              const next = new Map(prev);
              next.set(validated.id, validated);
              return next;
            }
            return prev;
          }
          const next = new Map(prev);
          next.set(validated.id, validated);
          return next;
        });
      }
    });

    channel.on("broadcast", { event: "object:delete" }, ({ payload }) => {
      const p = payload as DeletePayload;
      setObjectsMap((prev) => {
        if (!prev.has(p.id)) return prev;
        const next = new Map(prev);
        next.delete(p.id);
        return next;
      });
    });

    channel.on("broadcast", { event: "ai:result" }, ({ payload }) => {
      const p = payload as { objects: unknown[]; userId: string };
      // Skip if we sent this AI command (we already merged from the API response)
      if (p.userId === userId) return;
      const validated = validateBoardObjects(p.objects);
      if (validated.length > 0) {
        setObjectsMap((prev) => {
          const next = new Map(prev);
          for (const obj of validated) {
            next.set(obj.id, obj);
          }
          return next;
        });
      }
    });

    void channel.subscribe((status: string) => {
      if (DEBUG_REALTIME) console.log("[Realtime] channel status:", status); // eslint-disable-line no-console
      if (status === "SUBSCRIBED") {
        subscribedRef.current = true;
        void channel
          .track({
            userName,
            color: userColor,
            onlineAt: new Date().toISOString(),
          })
          .then((resp) => {
            if (DEBUG_REALTIME) console.log("[Realtime] track result:", resp); // eslint-disable-line no-console
          });
      }
    });

    channelRef.current = channel;
    return () => {
      subscribedRef.current = false;
      // Clear undo/redo stack on disconnect
      historyRef.current.clear();
      void realtimeSupabase.removeChannel(channel);
    };
  }, [boardId, userId, userName, userColor, realtimeSupabase]);

  const broadcastCursor = useCallback(
    (x: number, y: number) => {
      if (!subscribedRef.current) return;
      void channelRef.current?.send({
        type: "broadcast",
        event: "cursor",
        payload: { userId, userName, x, y, color: userColor },
      });
    },
    [userId, userName, userColor]
  );

  const createObject = useCallback(
    async (type: ObjectType, x: number, y: number, width?: number, height?: number) => {
      const defaults = OBJECT_DEFAULTS[type];
      const obj = createSimpleBoardObject(type, {
        id: uuidv4(),
        board_id: boardId,
        x,
        y,
        width: width ?? defaults.width ?? 200,
        height: height ?? defaults.height ?? 200,
        rotation: 0,
        content: defaults.content ?? "",
        color: defaults.color ?? "#FFEB3B",
        version: 1,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        parent_frame_id: null,
        properties: {},
      });

      setObjectsMap((prev) => {
        const next = new Map(prev);
        next.set(obj.id, obj);
        return next;
      });

      if (subscribedRef.current) {
        channelRef.current
          ?.send({
            type: "broadcast",
            event: "object:upsert",
            payload: { ...obj, _source: userId },
          })
          .catch((err: unknown) => {
            console.warn("[Broadcast] create send failed:", err); // eslint-disable-line no-console
          });
      }

      await supabase.from("board_objects").insert(obj as unknown as TablesInsert<"board_objects">);

      return obj;
    },
    [boardId, userId, supabase]
  );

  const updateObject = useCallback(
    (id: string, changes: Partial<BoardObject>) => {
      setObjectsMap((prev) => {
        const o = prev.get(id);
        if (!o) return prev;

        const updated = mergeBoardObjectChanges(o, changes, {
          version: o.version + 1,
          updated_at: new Date().toISOString(),
        });

        if (subscribedRef.current) {
          channelRef.current
            ?.send({
              type: "broadcast",
              event: "object:upsert",
              payload: { ...updated, _source: userId },
            })
            .catch((err: unknown) => {
              console.warn("[Broadcast] update send failed:", err); // eslint-disable-line no-console
            });
        }

        void supabase
          .from("board_objects")
          .update({
            ...changes,
            version: updated.version,
            updated_at: updated.updated_at,
          } as unknown as TablesUpdate<"board_objects">)
          .eq("id", id)
          .then(({ error }) => {
            if (error) {
              console.warn("[Supabase] update error:", error.message); // eslint-disable-line no-console
            }
          });

        const next = new Map(prev);
        next.set(id, updated);
        return next;
      });
    },
    [userId, supabase]
  );

  const broadcastMoves = useCallback(
    (updatedObjects: BoardObject[]) => {
      if (!subscribedRef.current) return;
      for (const updated of updatedObjects) {
        channelRef.current
          ?.send({
            type: "broadcast",
            event: "object:upsert",
            payload: { ...updated, _source: userId },
          })
          .catch((err: unknown) => {
            console.warn("[Broadcast] move send failed:", err); // eslint-disable-line no-console
          });
      }
    },
    [userId]
  );

  const BROADCAST_THROTTLE_MS = 50;

  const moveObjects = useCallback(
    (moves: { id: string; x: number; y: number }[], persist = false) => {
      if (DEBUG_REALTIME)
        console.log("[Realtime] moveObjects batch:", moves.length, "objects, persist:", persist); // eslint-disable-line no-console

      // Apply moves to local state
      setObjectsMap((prev) => {
        const next = new Map(prev);
        let changed = false;
        for (const move of moves) {
          const o = next.get(move.id);
          if (!o) continue;
          changed = true;
          const updated = updateBoardObject(o, {
            x: move.x,
            y: move.y,
            version: o.version + 1,
            updated_at: new Date().toISOString(),
          });

          next.set(move.id, updated);

          if (persist) {
            void supabase
              .from("board_objects")
              .update({
                x: move.x,
                y: move.y,
                version: updated.version,
                updated_at: updated.updated_at,
              })
              .eq("id", o.id)
              .then(({ error }) => {
                if (error) {
                  console.warn("[Supabase] move persist error:", error.message); // eslint-disable-line no-console
                }
              });
          }
        }
        return changed ? next : prev;
      });

      // Read the just-updated objects from the synchronous ref for broadcast
      const getUpdatedObjects = (): BoardObject[] => {
        const result: BoardObject[] = [];
        for (const move of moves) {
          const obj = objectsMapRef.current.get(move.id);
          if (obj) {
            result.push(obj);
          }
        }
        return result;
      };

      // Broadcast: always on persist (mouseup), throttled during drag
      if (persist) {
        // Clear any pending throttled broadcast
        if (broadcastThrottleRef.current) {
          clearTimeout(broadcastThrottleRef.current);
          broadcastThrottleRef.current = null;
        }
        broadcastMoves(getUpdatedObjects());
        lastBroadcastTimeRef.current = Date.now();
      } else {
        const now = Date.now();
        const elapsed = now - lastBroadcastTimeRef.current;

        if (elapsed >= BROADCAST_THROTTLE_MS) {
          // Leading edge: broadcast immediately
          broadcastMoves(getUpdatedObjects());
          lastBroadcastTimeRef.current = now;
        } else {
          // Schedule trailing-edge broadcast with latest positions
          if (broadcastThrottleRef.current) {
            clearTimeout(broadcastThrottleRef.current);
          }
          broadcastThrottleRef.current = setTimeout(() => {
            broadcastThrottleRef.current = null;
            broadcastMoves(getUpdatedObjects());
            lastBroadcastTimeRef.current = Date.now();
          }, BROADCAST_THROTTLE_MS - elapsed);
        }
      }
    },
    [supabase, broadcastMoves]
  );

  const deleteObject = useCallback(
    async (id: string) => {
      // If deleting a frame, nullify parent_frame_id on its children first
      setObjectsMap((prev) => {
        const objToDelete = prev.get(id);
        if (!objToDelete) return prev;
        const next = new Map(prev);

        if (objToDelete.type === "frame") {
          for (const [childId, child] of next) {
            if (child.parent_frame_id === id && childId !== id) {
              const updated = updateBoardObject(child, {
                parent_frame_id: null,
                version: child.version + 1,
                updated_at: new Date().toISOString(),
              });
              next.set(childId, updated);

              // Persist child update
              void supabase
                .from("board_objects")
                .update({
                  parent_frame_id: null,
                  version: updated.version,
                  updated_at: updated.updated_at,
                })
                .eq("id", childId);
            }
          }
        }

        next.delete(id);
        return next;
      });

      if (subscribedRef.current) {
        channelRef.current
          ?.send({
            type: "broadcast",
            event: "object:delete",
            payload: { id },
          })
          .catch((err: unknown) => {
            console.warn("[Broadcast] delete send failed:", err); // eslint-disable-line no-console
          });
      }

      await supabase.from("board_objects").delete().eq("id", id);
    },
    [supabase]
  );

  // Merge objects into local state only (no broadcast/persist).
  // Used when the server has already persisted and broadcast (e.g., AI command results).
  const mergeObjects = useCallback((objs: BoardObject[]) => {
    setObjectsMap((prev) => {
      const next = new Map(prev);
      for (const obj of objs) {
        next.set(obj.id, obj);
      }
      return next;
    });
  }, []);

  return {
    objects,
    camera,
    setCamera,
    selectedIds,
    setSelectedIds,
    activeTool,
    setActiveTool,
    cursors,
    presenceUsers,
    editingId,
    setEditingId,
    loadObjects,
    subscribe,
    broadcastCursor,
    createObject,
    updateObject,
    moveObjects,
    deleteObject,
    userColor,
    // Undo/redo
    undo,
    redo,
    canUndo,
    canRedo,
    history: historyRef.current,
    // Mutation pipeline
    mutate,
    mutateRemove,
    getPipeline,
    // Local-only merge (for server-side results)
    mergeObjects,
  };
}
