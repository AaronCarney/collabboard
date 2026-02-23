import { generateText, Output, NoObjectGeneratedError } from "ai";
import { openai } from "@ai-sdk/openai";
import type { BoardObject } from "@collabboard/shared";
import { matchTemplate, generateTemplate } from "./templates";
import { buildSystemPrompt } from "./system-prompt";
import { instrument } from "./observability/instrument";
import { classifyContextNeed } from "./context-pruning";
import { getSession, saveSession, resolveAnaphora } from "./session-memory";
import { PlanSchema } from "./plan-schema";
import type { Plan } from "./plan-schema";
import { validatePlan } from "./plan-validator";
import { executePlan } from "./plan-executor";
import { classifyError, ERROR_MESSAGES } from "./error-handler";

export interface CommandInput {
  command: string;
  boardId: string;
  userId: string;
  existingObjects: BoardObject[];
  viewportCenter?: { x: number; y: number };
  selectedObjectIds?: string[];
}

export interface CommandResult {
  success: boolean;
  objects: BoardObject[];
  deletedIds?: string[];
  message: string;
  tokensUsed: number;
  latencyMs: number;
  isTemplate: boolean;
}

/** Maximum number of generateObject retries on NoObjectGeneratedError. */
const MAX_RETRIES = 2;

/**
 * Route a user command to either a template generator or the LLM.
 */
export async function routeCommand(input: CommandInput): Promise<CommandResult> {
  const startTime = Date.now();
  const center = input.viewportCenter ?? { x: 400, y: 300 };

  // Check for template match first (bypasses LLM entirely)
  const templateName = matchTemplate(input.command);
  if (templateName) {
    const result = generateTemplate(templateName, input.boardId, input.userId, center);
    const latencyMs = Date.now() - startTime;

    // Fire-and-forget — never blocks the response
    void instrument({
      userId: input.userId,
      boardId: input.boardId,
      command: input.command,
      commandType: "template",
      prompt: input.command,
      completion: result.message,
      tokensUsed: 0,
      latencyMs,
      success: true,
    });

    return {
      success: true,
      objects: result.objects,
      message: result.message,
      tokensUsed: 0,
      latencyMs,
      isTemplate: true,
    };
  }

  // Route to LLM with structured output
  return routeToLlm(input, startTime, center);
}

async function routeToLlm(
  input: CommandInput,
  startTime: number,
  center: { x: number; y: number }
): Promise<CommandResult> {
  // Build a default viewport from center point (800x600)
  const viewport = {
    x: center.x - 400,
    y: center.y - 300,
    width: 800,
    height: 600,
  };

  // Resolve anaphoric references ("it", "them", "those", etc.) using session memory
  const session = getSession(input.userId, input.boardId);
  const anaphoraIds = resolveAnaphora(input.command, session);
  const selectedIds = anaphoraIds ?? input.selectedObjectIds ?? [];

  // Classify context need — skip full board state for simple create commands
  const contextNeed = classifyContextNeed(input.command, false);
  const objectsForContext =
    contextNeed === "none" || contextNeed === "viewport_center_only" ? [] : input.existingObjects;

  const systemPrompt = buildSystemPrompt(objectsForContext, viewport, selectedIds);

  // Retry loop for structured output generation
  let plan: Plan | null = null;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await generateText({
        model: openai("gpt-4o-mini"),
        system: systemPrompt,
        prompt: input.command,
        output: Output.object({ schema: PlanSchema }),
      });

      plan = result.output;
      totalInputTokens += result.usage.inputTokens ?? 0;
      totalOutputTokens += result.usage.outputTokens ?? 0;
      break;
    } catch (err: unknown) {
      if (err instanceof NoObjectGeneratedError && attempt < MAX_RETRIES) {
        // Retry — the model failed to produce valid output
        continue;
      }
      // Final attempt failed or non-retryable error — classify and return error
      const category = classifyError(err);
      const latencyMs = Date.now() - startTime;

      void instrument({
        userId: input.userId,
        boardId: input.boardId,
        command: input.command,
        commandType: "llm",
        prompt: `${systemPrompt}\n\n${input.command}`,
        completion: `Error: ${category}`,
        tokensUsed: totalInputTokens + totalOutputTokens,
        latencyMs,
        success: false,
      });

      return {
        success: false,
        objects: [],
        message: ERROR_MESSAGES[category],
        tokensUsed: totalInputTokens + totalOutputTokens,
        latencyMs,
        isTemplate: false,
      };
    }
  }

  // This should not happen given the loop structure, but satisfies type checker
  if (!plan) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      objects: [],
      message: ERROR_MESSAGES.no_understand,
      tokensUsed: totalInputTokens + totalOutputTokens,
      latencyMs,
      isTemplate: false,
    };
  }

  // Validate the plan against existing board state
  const validation = validatePlan(plan, input.existingObjects);
  const validatedPlan = validation.corrected;

  // Execute the plan synchronously — no I/O
  const execResult = executePlan(validatedPlan, input.boardId, input.userId, input.existingObjects);

  // Combine new objects and modified objects for the result
  const allObjects = [...execResult.objects, ...execResult.modifiedObjects];

  // Persist session state for anaphora resolution in subsequent commands
  const createdIds = execResult.objects.map((o) => o.id);
  const modifiedIds = execResult.modifiedObjects.map((o) => o.id);
  saveSession(input.userId, input.boardId, {
    lastCreatedIds: createdIds,
    lastModifiedIds: modifiedIds,
    lastCommandText: input.command,
    timestamp: Date.now(),
  });

  const tokensUsed = totalInputTokens + totalOutputTokens;
  const latencyMs = Date.now() - startTime;

  // Fire-and-forget — never blocks the response
  void instrument({
    userId: input.userId,
    boardId: input.boardId,
    command: input.command,
    commandType: "llm",
    prompt: `${systemPrompt}\n\n${input.command}`,
    completion: validatedPlan.message,
    tokensUsed,
    latencyMs,
    success: true,
  });

  return {
    success: true,
    objects: allObjects,
    deletedIds: execResult.deletedIds.length > 0 ? execResult.deletedIds : undefined,
    message: validatedPlan.message,
    tokensUsed,
    latencyMs,
    isTemplate: false,
  };
}
