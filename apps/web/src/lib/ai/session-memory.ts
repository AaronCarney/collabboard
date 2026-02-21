export interface SessionEntry {
  lastCreatedIds: string[];
  lastModifiedIds: string[];
  lastCommandText: string;
  timestamp: number;
}

export const TTL_MS: number = 5 * 60 * 1000;

const store = new Map<string, SessionEntry>();

export function getSession(userId: string, boardId: string): SessionEntry | null {
  const key = `${userId}:${boardId}`;
  const entry = store.get(key);
  if (!entry) {
    return null;
  }
  if (Date.now() - entry.timestamp > TTL_MS) {
    store.delete(key);
    return null;
  }
  return entry;
}

export function saveSession(userId: string, boardId: string, entry: SessionEntry): void {
  const key = `${userId}:${boardId}`;
  store.set(key, entry);

  // Evict all stale entries
  const now = Date.now();
  for (const [storeKey, value] of store) {
    if (now - value.timestamp > TTL_MS) {
      store.delete(storeKey);
    }
  }
}

export function resolveAnaphora(command: string, session: SessionEntry | null): string[] | null {
  if (!session) {
    return null;
  }

  const singularPattern = /\b(it|that)\b/i;
  const pluralPattern = /\b(them|those|these)\b/i;

  if (singularPattern.test(command) && session.lastCreatedIds.length === 1) {
    return session.lastCreatedIds;
  }

  if (pluralPattern.test(command) && session.lastCreatedIds.length > 0) {
    return session.lastCreatedIds;
  }

  return null;
}
