import { traceLangSmith } from "./langsmith";
import { traceLangFuse } from "./langfuse";

export interface TraceData {
  userId: string;
  boardId: string;
  command: string;
  commandType: "llm" | "template";
  prompt: string;
  completion: string;
  tokensUsed: number;
  latencyMs: number;
  success: boolean;
  error?: string;
}

/**
 * Strip board state from prompts before sending to observability providers.
 * Replaces the "## Board State" section (up to the next ## header or end of string)
 * with a redaction marker showing how many characters were removed.
 */
export function redactPrompt(prompt: string): string {
  const boardStatePattern = /## Board State\n[\s\S]*?(?=\n## |\n*$)/;
  const match = boardStatePattern.exec(prompt);
  if (!match) {
    return prompt;
  }
  const contentLength = match[0].length - "## Board State\n".length;
  return prompt.replace(
    boardStatePattern,
    `## Board State\n[REDACTED — ${String(contentLength)} chars]`
  );
}

/**
 * Send trace data to all configured observability providers.
 * Uses Promise.allSettled — failures in one provider never affect others.
 * This function is designed to be fire-and-forget in production:
 *   void instrument(data)  // don't await in the request path
 */
export async function instrument(data: TraceData): Promise<void> {
  const redactedData = { ...data, prompt: redactPrompt(data.prompt) };
  await Promise.allSettled([traceLangSmith(redactedData), traceLangFuse(redactedData)]);
}
