export interface SessionEntry {
  lastCreatedIds: string[];
  lastModifiedIds: string[];
  lastCommandText: string;
  timestamp: number;
}

export const TTL_MS: number = 5 * 60 * 1000;
export const MAX_ENTRIES = 1000;

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

  // Evict all stale entries
  const now = Date.now();
  for (const [storeKey, value] of store) {
    if (now - value.timestamp > TTL_MS) {
      store.delete(storeKey);
    }
  }

  // Enforce entry cap — evict oldest if at capacity
  while (store.size >= MAX_ENTRIES) {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;
    for (const [storeKey, val] of store) {
      if (val.timestamp < oldestTimestamp) {
        oldestTimestamp = val.timestamp;
        oldestKey = storeKey;
      }
    }
    if (oldestKey) {
      store.delete(oldestKey);
    } else {
      break;
    }
  }

  store.set(key, entry);
}

/** @internal — for testing only */
export function resetStore(): void {
  store.clear();
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

  if (pluralPattern.test(command)) {
    if (session.lastCreatedIds.length > 1) {
      return session.lastCreatedIds;
    }
    if (session.lastModifiedIds.length > 1) {
      return session.lastModifiedIds;
    }
  }

  return null;
}
