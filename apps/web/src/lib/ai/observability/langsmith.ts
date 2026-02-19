import type { TraceData } from "./instrument";

/**
 * Check if LangSmith is configured via env vars.
 */
export function isLangSmithEnabled(): boolean {
  return !!(
    process.env.LANGCHAIN_API_KEY &&
    process.env.LANGCHAIN_PROJECT &&
    process.env.LANGCHAIN_TRACING_V2 === "true"
  );
}

/**
 * Send trace data to LangSmith.
 * Requires: LANGCHAIN_API_KEY, LANGCHAIN_PROJECT, LANGCHAIN_TRACING_V2=true
 *
 * When langsmith package is not installed, this is a no-op.
 */
export async function traceLangSmith(data: TraceData): Promise<void> {
  if (!isLangSmithEnabled()) return;

  try {
    // Dynamic import — only loads when langsmith is installed
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { Client } = await import("langsmith");
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const client = new Client();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await client.createRun({
      name: `ai-command:${data.commandType}`,
      run_type: "llm",
      inputs: {
        command: data.command,
        userId: data.userId,
        boardId: data.boardId,
        prompt: data.prompt,
      },
      outputs: {
        completion: data.completion,
        tokensUsed: data.tokensUsed,
        success: data.success,
        error: data.error,
      },
      extra: {
        latencyMs: data.latencyMs,
        commandType: data.commandType,
      },
      start_time: new Date(Date.now() - data.latencyMs),
      end_time: new Date(),
    });
  } catch {
    // langsmith not installed or API error — silently ignore
  }
}
