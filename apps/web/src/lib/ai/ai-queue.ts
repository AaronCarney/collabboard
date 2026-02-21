// Module-level singleton — not safe for multi-instance serverless; acceptable for single-process deploys.
const activeCommands = new Map<string, Promise<unknown>>();

export async function enqueueForUser<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  const existing = activeCommands.get(userId) ?? Promise.resolve();
  const execution = existing.then(
    () => fn(),
    () => fn()
  );
  activeCommands.set(userId, execution);
  try {
    return await execution;
  } finally {
    if (activeCommands.get(userId) === execution) {
      activeCommands.delete(userId);
    }
  }
}
