"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import type { BoardObject, ObjectType, CursorPosition, PresenceUser } from "@/types/board";
import { OBJECT_DEFAULTS, USER_COLORS } from "@/types/board";
import { boardObjectSchema } from "@collabboard/shared";
import { v4 as uuidv4 } from "uuid";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hashCode, shouldAcceptUpdate } from "@/lib/board-logic";
import { createCommandHistory } from "@/lib/board-commands";
import type { CommandHistory, MutationPipeline } from "@/lib/board-commands";

const DEBUG_REALTIME =
  process.env.NEXT_PUBLIC_DEBUG_REALTIME === "true" ||
  (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("debug"));

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
 * Validate an array of raw objects against the boardObjectSchema.
 * Returns only the objects that pass validation; logs warnings for invalid ones.
 */
function validateBoardObjects(raw: unknown[]): BoardObject[] {
  const valid: BoardObject[] = [];
  for (const item of raw) {
    const result = boardObjectSchema.safeParse(item);
    if (result.success) {
      valid.push(result.data as BoardObject);
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
    return result.data as BoardObject;
  }
  if (DEBUG_REALTIME) {
    console.warn("[Zod] rejected broadcast payload:", result.error.issues); // eslint-disable-line no-console
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function useBoardStore(
  boardId: string,
  userId: string,
  userName: string,
  supabase: SupabaseClient,
  realtimeSupabase: SupabaseClient
) {
  const [objectsMap, setObjectsMap] = useState<Map<string, BoardObject>>(new Map());
  const objects = useMemo(() => Array.from(objectsMap.values()), [objectsMap]);
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTool, setActiveTool] = useState<ObjectType | "select">("select");
  const [cursors, setCursors] = useState<Map<string, CursorPosition>>(new Map());
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof realtimeSupabase.channel> | null>(null);
  const subscribedRef = useRef(false);
  const historyRef = useRef<CommandHistory>(createCommandHistory());

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
          .upsert(obj)
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
        // Read the latest objects through the Map ref
        let found: BoardObject | null = null;
        setObjectsMap((prev) => {
          found = prev.get(id) ?? null;
          return prev;
        });
        return found;
      },
    };
  }, [mutate, mutateRemove]);

  // ─── History (undo/redo) ───────────────────────────────────

  const history = historyRef.current;

  const undo = useCallback(() => {
    history.undo();
  }, [history]);

  const redo = useCallback(() => {
    history.redo();
  }, [history]);

  const canUndo = history.canUndo();
  const canRedo = history.canRedo();

  // ─── Load + Subscribe ──────────────────────────────────────

  const loadObjects = useCallback(async () => {
    const { data } = await supabase.from("board_objects").select("*").eq("board_id", boardId);
    if (data) {
      const validated = validateBoardObjects(data);
      const map = new Map<string, BoardObject>();
      for (const obj of validated) {
        map.set(obj.id, obj);
      }
      setObjectsMap(map);
    }
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
    async (type: ObjectType, x: number, y: number) => {
      const defaults = OBJECT_DEFAULTS[type];
      const obj = {
        id: uuidv4(),
        board_id: boardId,
        type,
        x,
        y,
        width: defaults.width ?? 200,
        height: defaults.height ?? 200,
        rotation: 0,
        content: defaults.content ?? "",
        color: defaults.color ?? "#FFEB3B",
        version: 1,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        parent_frame_id: null,
        properties: {},
      } as BoardObject;

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

      await supabase.from("board_objects").insert(obj);

      return obj;
    },
    [boardId, userId, supabase]
  );

  const updateObject = useCallback(
    (id: string, changes: Partial<BoardObject>) => {
      setObjectsMap((prev) => {
        const o = prev.get(id);
        if (!o) return prev;

        const updated = {
          ...o,
          ...changes,
          version: o.version + 1,
          updated_at: new Date().toISOString(),
        } as BoardObject;

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
          })
          .eq("id", id);

        const next = new Map(prev);
        next.set(id, updated);
        return next;
      });
    },
    [userId, supabase]
  );

  const moveObjects = useCallback(
    (moves: { id: string; x: number; y: number }[], persist = false) => {
      if (DEBUG_REALTIME)
        console.log("[Realtime] moveObjects batch:", moves.length, "objects, persist:", persist); // eslint-disable-line no-console
      setObjectsMap((prev) => {
        const next = new Map(prev);
        let changed = false;
        for (const move of moves) {
          const o = next.get(move.id);
          if (!o) continue;
          changed = true;
          const updated = {
            ...o,
            x: move.x,
            y: move.y,
            version: o.version + 1,
            updated_at: new Date().toISOString(),
          } as BoardObject;

          next.set(move.id, updated);

          if (subscribedRef.current) {
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

          if (persist) {
            void supabase
              .from("board_objects")
              .update({
                x: move.x,
                y: move.y,
                version: updated.version,
                updated_at: updated.updated_at,
              })
              .eq("id", o.id);
          }
        }
        return changed ? next : prev;
      });
    },
    [userId, supabase]
  );

  const deleteObject = useCallback(
    async (id: string) => {
      setObjectsMap((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Map(prev);
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
  };
}
