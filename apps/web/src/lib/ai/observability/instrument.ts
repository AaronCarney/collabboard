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
 * Send trace data to all configured observability providers.
 * Uses Promise.allSettled — failures in one provider never affect others.
 * This function is designed to be fire-and-forget in production:
 *   void instrument(data)  // don't await in the request path
 */
export async function instrument(data: TraceData): Promise<void> {
  await Promise.allSettled([traceLangSmith(data), traceLangFuse(data)]);
}
