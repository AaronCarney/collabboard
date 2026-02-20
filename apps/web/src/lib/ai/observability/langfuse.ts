import type { TraceData } from "./instrument";

/**
 * Check if LangFuse is configured via env vars.
 */
export function isLangFuseEnabled(): boolean {
  return !!(
    process.env.LANGFUSE_SECRET_KEY &&
    process.env.LANGFUSE_PUBLIC_KEY &&
    process.env.LANGFUSE_HOST
  );
}

/**
 * Send trace data to LangFuse.
 * Requires: LANGFUSE_SECRET_KEY, LANGFUSE_PUBLIC_KEY, LANGFUSE_HOST
 *
 * When langfuse package is not installed, this is a no-op.
 */
export async function traceLangFuse(data: TraceData): Promise<void> {
  if (!isLangFuseEnabled()) return;

  try {
    // Dynamic import — only loads when langfuse is installed
    // @ts-expect-error — langfuse is an optional dependency
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { Langfuse } = await import("langfuse");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const langfuse = new Langfuse({
      secretKey: process.env.LANGFUSE_SECRET_KEY ?? "",
      publicKey: process.env.LANGFUSE_PUBLIC_KEY ?? "",
      baseUrl: process.env.LANGFUSE_HOST ?? "",
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const trace = langfuse.trace({
      name: `ai-command:${data.commandType}`,
      userId: data.userId,
      metadata: {
        boardId: data.boardId,
        commandType: data.commandType,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    trace.generation({
      name: "llm-call",
      model: "gpt-4o-mini",
      input: data.prompt,
      output: data.completion,
      usage: {
        totalTokens: data.tokensUsed,
      },
      metadata: {
        command: data.command,
        latencyMs: data.latencyMs,
        success: data.success,
        error: data.error,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await langfuse.shutdownAsync();
  } catch {
    // langfuse not installed or API error — silently ignore
  }
}
