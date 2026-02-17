'use client';

import { useState, useCallback, useRef } from 'react';
import type { BoardObject, ObjectType, CursorPosition, PresenceUser } from '@/types/board';
import { OBJECT_DEFAULTS, USER_COLORS } from '@/types/board';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

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

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function useBoardStore(boardId: string, userId: string, userName: string) {
  const [objects, setObjects] = useState<BoardObject[]>([]);
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<ObjectType | 'select'>('select');
  const [cursors, setCursors] = useState<Map<string, CursorPosition>>(new Map());
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const userColor = USER_COLORS[Math.abs(hashCode(userId)) % USER_COLORS.length];

  const loadObjects = useCallback(async () => {
    const { data } = await supabase
      .from('board_objects')
      .select('*')
      .eq('board_id', boardId);
    if (data) setObjects(data as BoardObject[]);
  }, [boardId]);

  const subscribe = useCallback(() => {
    const channel = supabase.channel(`board:${boardId}`, {
      config: { presence: { key: userId } },
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<{ userName: string; color: string; onlineAt: string }>();
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

    channel.on('broadcast', { event: 'cursor' }, ({ payload }) => {
      const p = payload as CursorPayload;
      if (p.userId !== userId) {
        setCursors((prev) => {
          const next = new Map(prev);
          next.set(p.userId, p);
          return next;
        });
      }
    });

    channel.on('broadcast', { event: 'object:upsert' }, ({ payload }) => {
      const p = payload as BroadcastPayload;
      if (p._source !== userId) {
        setObjects((prev) => {
          const idx = prev.findIndex((o) => o.id === p.id);
          if (idx >= 0) {
            if (p.version >= prev[idx].version) {
              const next = [...prev];
              next[idx] = p as unknown as BoardObject;
              return next;
            }
            return prev;
          }
          return [...prev, p as unknown as BoardObject];
        });
      }
    });

    channel.on('broadcast', { event: 'object:delete' }, ({ payload }) => {
      const p = payload as DeletePayload;
      setObjects((prev) => prev.filter((o) => o.id !== p.id));
    });

    void channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        void channel.track({
          userName,
          color: userColor,
          onlineAt: new Date().toISOString(),
        });
      }
    });

    channelRef.current = channel;
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [boardId, userId, userName, userColor]);

  const broadcastCursor = useCallback(
    (x: number, y: number) => {
      void channelRef.current?.send({
        type: 'broadcast',
        event: 'cursor',
        payload: { userId, userName, x, y, color: userColor },
      });
    },
    [userId, userName, userColor]
  );

  const createObject = useCallback(
    async (type: ObjectType, x: number, y: number) => {
      const defaults = OBJECT_DEFAULTS[type];
      const obj: BoardObject = {
        id: uuidv4(),
        board_id: boardId,
        type,
        x,
        y,
        width: defaults.width ?? 200,
        height: defaults.height ?? 200,
        rotation: 0,
        content: defaults.content ?? '',
        color: defaults.color ?? '#FFEB3B',
        version: 1,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setObjects((prev) => [...prev, obj]);

      void channelRef.current?.send({
        type: 'broadcast',
        event: 'object:upsert',
        payload: { ...obj, _source: userId },
      });

      await supabase.from('board_objects').insert(obj);

      return obj;
    },
    [boardId, userId]
  );

  const updateObject = useCallback(
    (id: string, changes: Partial<BoardObject>) => {
      setObjects((prev) =>
        prev.map((o) => {
          if (o.id !== id) return o;
          const updated = {
            ...o,
            ...changes,
            version: o.version + 1,
            updated_at: new Date().toISOString(),
          };

          void channelRef.current?.send({
            type: 'broadcast',
            event: 'object:upsert',
            payload: { ...updated, _source: userId },
          });

          void supabase
            .from('board_objects')
            .update({
              ...changes,
              version: updated.version,
              updated_at: updated.updated_at,
            })
            .eq('id', id);

          return updated;
        })
      );
    },
    [userId]
  );

  const deleteObject = useCallback(
    async (id: string) => {
      setObjects((prev) => prev.filter((o) => o.id !== id));

      void channelRef.current?.send({
        type: 'broadcast',
        event: 'object:delete',
        payload: { id },
      });

      await supabase.from('board_objects').delete().eq('id', id);
    },
    []
  );

  return {
    objects,
    camera,
    setCamera,
    selectedId,
    setSelectedId,
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
    deleteObject,
    userColor,
  };
}

function hashCode(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}
