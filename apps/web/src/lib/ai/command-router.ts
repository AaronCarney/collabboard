import { generateText, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import type { BoardObject } from "@collabboard/shared";
import { matchTemplate, generateTemplate } from "./templates";
import { buildSystemPrompt } from "./system-prompt";
import { instrument } from "./observability/instrument";
import { validateToolCallArgs } from "./validation";
import {
  getToolDefinitions,
  executeCreateStickyNote,
  executeCreateShape,
  executeCreateFrame,
  executeMoveObject,
  executeResizeObject,
  executeUpdateText,
  executeChangeColor,
  executeCreateConnector,
  executeDeleteObject,
} from "./tools";
import type { DeletionMarker } from "./tools";

export interface CommandInput {
  command: string;
  boardId: string;
  userId: string;
  existingObjects: BoardObject[];
  viewportCenter?: { x: number; y: number };
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

  // Route to LLM
  return routeToLlm(input, startTime, center);
}

async function routeToLlm(
  input: CommandInput,
  startTime: number,
  center: { x: number; y: number }
): Promise<CommandResult> {
  const systemPrompt = buildSystemPrompt(input.existingObjects, center);
  const tools = getToolDefinitions();

  const result = await generateText({
    model: openai("gpt-4o-mini"),
    system: systemPrompt,
    prompt: input.command,
    tools,
    stopWhen: stepCountIs(20),
  });

  // Process tool calls into BoardObjects and DeletionMarkers
  const objects: BoardObject[] = [];
  const deletedIds: string[] = [];

  for (const toolCall of result.toolCalls) {
    const callResult = executeToolCall(
      toolCall.toolName,
      toolCall.input as Record<string, unknown>,
      input.boardId,
      input.userId,
      input.existingObjects
    );
    if (callResult) {
      if (Array.isArray(callResult)) {
        objects.push(...callResult);
      } else if (isDeletionMarker(callResult)) {
        deletedIds.push(callResult.objectId);
      } else {
        objects.push(callResult);
      }
    }
  }

  const tokensUsed = (result.usage.inputTokens ?? 0) + (result.usage.outputTokens ?? 0);
  const latencyMs = Date.now() - startTime;

  // Fire-and-forget — never blocks the response
  void instrument({
    userId: input.userId,
    boardId: input.boardId,
    command: input.command,
    commandType: "llm",
    prompt: `${systemPrompt}\n\n${input.command}`,
    completion: result.text || `${String(result.toolCalls.length)} tool call(s)`,
    tokensUsed,
    latencyMs,
    success: true,
  });

  return {
    success: true,
    objects,
    deletedIds: deletedIds.length > 0 ? deletedIds : undefined,
    message: `Executed ${String(result.toolCalls.length)} action(s) via AI`,
    tokensUsed,
    latencyMs,
    isTemplate: false,
  };
}

function isDeletionMarker(value: unknown): value is DeletionMarker {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    (value as Record<string, unknown>).type === "deletion"
  );
}

function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
  boardId: string,
  userId: string,
  existingObjects: BoardObject[]
): BoardObject | BoardObject[] | DeletionMarker | null {
  // Validate and clamp args before executing
  const validation = validateToolCallArgs(toolName, args, existingObjects);
  if (!validation.valid) {
    return null;
  }
  if (validation.clamped.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(`Tool "${toolName}" had clamped values: ${validation.clamped.join(", ")}`);
  }

  switch (toolName) {
    case "createStickyNote":
      return executeCreateStickyNote(
        args as Parameters<typeof executeCreateStickyNote>[0],
        boardId,
        userId
      );
    case "createShape":
      return executeCreateShape(args as Parameters<typeof executeCreateShape>[0], boardId, userId);
    case "createFrame":
      return executeCreateFrame(args as Parameters<typeof executeCreateFrame>[0], boardId, userId);
    case "moveObject":
      return executeMoveObject(args as Parameters<typeof executeMoveObject>[0], existingObjects);
    case "resizeObject":
      return executeResizeObject(
        args as Parameters<typeof executeResizeObject>[0],
        existingObjects
      );
    case "updateText":
      return executeUpdateText(args as Parameters<typeof executeUpdateText>[0], existingObjects);
    case "changeColor":
      return executeChangeColor(args as Parameters<typeof executeChangeColor>[0], existingObjects);
    case "getBoardState":
      return existingObjects;
    case "create_connector":
      return executeCreateConnector(
        args as Parameters<typeof executeCreateConnector>[0],
        boardId,
        userId,
        existingObjects
      );
    case "delete_object":
      return executeDeleteObject(
        args as Parameters<typeof executeDeleteObject>[0],
        existingObjects
      );
    default:
      return null;
  }
}
