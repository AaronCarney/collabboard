export type AIErrorCategory =
  | "no_understand"
  | "out_of_scope"
  | "execution_error"
  | "service_unavailable"
  | "partial_failure";

export const ERROR_MESSAGES: Record<AIErrorCategory, string> = {
  no_understand:
    "I didn't understand that. Try something like 'create a yellow sticky note' or 'arrange these in a grid.'",
  out_of_scope: "I can only create and arrange objects on the board.",
  execution_error: "Something went wrong while executing that command. Please try again.",
  service_unavailable: "The AI service is temporarily unavailable. Please try again in a moment.",
  partial_failure: "I completed part of your request, but ran into an issue with some operations.",
};

interface ToolCallResult {
  success: boolean;
  toolName?: string;
  error?: string;
}

export function classifyError(err: unknown, toolCallResults?: ToolCallResult[]): AIErrorCategory {
  if (
    err instanceof Error &&
    "status" in err &&
    typeof (err as Error & { status: unknown }).status === "number"
  ) {
    const status = (err as Error & { status: number }).status;
    if (status === 429 || status >= 500) {
      return "service_unavailable";
    }
  }

  if (toolCallResults !== undefined) {
    if (toolCallResults.length === 0) {
      return "no_understand";
    }
    const hasSuccess = toolCallResults.some((r) => r.success);
    const hasFailure = toolCallResults.some((r) => !r.success);
    if (hasSuccess && hasFailure) {
      return "partial_failure";
    }
  }

  return "execution_error";
}
