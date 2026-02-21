import { v4 as uuidv4 } from "uuid";
import type { BoardObject } from "@collabboard/shared";

export type TemplateName = "swot" | "kanban" | "retrospective" | "brainstorm" | "user_journey";

interface TemplateResult {
  objects: BoardObject[];
  message: string;
}

const TEMPLATE_PATTERNS: { pattern: RegExp; name: TemplateName }[] = [
  {
    pattern: /\bswot\b|strengths\s+and\s+weaknesses\b/i,
    name: "swot",
  },
  {
    pattern: /\bkanban\b|\btask\s+board\b|\bto\s+do\s+doing\s+done\b/i,
    name: "kanban",
  },
  {
    pattern:
      /\bretro(?:spective)?\b|\bstart\s+stop\s+continue\b|\bwhat\s+went\s+well\b|\bwent\s+well.*didn.?t\b/i,
    name: "retrospective",
  },
  {
    pattern: /\bbrain\s*storm(?:ing)?\b|\bidea\s+generation\b/i,
    name: "brainstorm",
  },
  {
    pattern: /\b(?:user|customer)\s+(?:journey|flow\s+map)\b/i,
    name: "user_journey",
  },
];

/**
 * Check if a command matches a known template pattern.
 * Returns the template name or null.
 */
export function matchTemplate(command: string): TemplateName | null {
  for (const { pattern, name } of TEMPLATE_PATTERNS) {
    if (pattern.test(command)) return name;
  }
  return null;
}

function makeTimestamp(): string {
  return new Date().toISOString();
}

function makeObj(
  overrides: Partial<BoardObject> & { type: BoardObject["type"] },
  boardId: string,
  userId: string
): BoardObject {
  return {
    id: uuidv4(),
    board_id: boardId,
    x: 0,
    y: 0,
    width: 200,
    height: 200,
    rotation: 0,
    content: "",
    color: "#FFEB3B",
    version: 1,
    created_by: userId,
    created_at: makeTimestamp(),
    updated_at: makeTimestamp(),
    parent_frame_id: null,
    properties: {},
    ...overrides,
  } as BoardObject;
}

function generateSwot(
  boardId: string,
  userId: string,
  center: { x: number; y: number }
): TemplateResult {
  const gap = 10;
  const cellW = 250;
  const cellH = 200;
  const startX = center.x - cellW - gap / 2;
  const startY = center.y - cellH - gap / 2;

  const colors = ["#A5D6A7", "#EF9A9A", "#90CAF9", "#FFE082"];
  const labels = ["Strengths", "Weaknesses", "Opportunities", "Threats"];
  const positions = [
    { x: startX, y: startY },
    { x: startX + cellW + gap, y: startY },
    { x: startX, y: startY + cellH + gap },
    { x: startX + cellW + gap, y: startY + cellH + gap },
  ];

  const frame = makeObj(
    {
      type: "frame",
      x: startX - 20,
      y: startY - 40,
      width: cellW * 2 + gap + 40,
      height: cellH * 2 + gap + 60,
      content: "SWOT Analysis",
      color: "#E0E0E0",
    },
    boardId,
    userId
  );

  const cells = labels.map((label, i) =>
    makeObj(
      {
        type: "sticky_note",
        x: positions[i].x,
        y: positions[i].y,
        width: cellW,
        height: cellH,
        content: label,
        color: colors[i],
        parent_frame_id: frame.id,
      },
      boardId,
      userId
    )
  );

  return {
    objects: [frame, ...cells],
    message: "Created SWOT Analysis template with 4 quadrants",
  };
}

function generateKanban(
  boardId: string,
  userId: string,
  center: { x: number; y: number }
): TemplateResult {
  const colW = 220;
  const colH = 400;
  const gap = 15;
  const columns = ["To Do", "In Progress", "Done"];
  const colors = ["#EF9A9A", "#FFE082", "#A5D6A7"];
  const startX = center.x - ((colW + gap) * columns.length - gap) / 2;
  const startY = center.y - colH / 2;

  const frame = makeObj(
    {
      type: "frame",
      x: startX - 20,
      y: startY - 40,
      width: (colW + gap) * columns.length - gap + 40,
      height: colH + 60,
      content: "Kanban Board",
      color: "#E0E0E0",
    },
    boardId,
    userId
  );

  const cols = columns.map((label, i) =>
    makeObj(
      {
        type: "rectangle",
        x: startX + i * (colW + gap),
        y: startY,
        width: colW,
        height: colH,
        content: label,
        color: colors[i],
        parent_frame_id: frame.id,
      },
      boardId,
      userId
    )
  );

  return {
    objects: [frame, ...cols],
    message: "Created Kanban Board template with 3 columns",
  };
}

function generateRetrospective(
  boardId: string,
  userId: string,
  center: { x: number; y: number }
): TemplateResult {
  const colW = 220;
  const colH = 350;
  const gap = 15;
  const columns = ["What went well", "What to improve", "Action items"];
  const colors = ["#A5D6A7", "#EF9A9A", "#90CAF9"];
  const startX = center.x - ((colW + gap) * columns.length - gap) / 2;
  const startY = center.y - colH / 2;

  const frame = makeObj(
    {
      type: "frame",
      x: startX - 20,
      y: startY - 40,
      width: (colW + gap) * columns.length - gap + 40,
      height: colH + 60,
      content: "Sprint Retrospective",
      color: "#E0E0E0",
    },
    boardId,
    userId
  );

  const cols = columns.map((label, i) =>
    makeObj(
      {
        type: "sticky_note",
        x: startX + i * (colW + gap),
        y: startY,
        width: colW,
        height: colH,
        content: label,
        color: colors[i],
        parent_frame_id: frame.id,
      },
      boardId,
      userId
    )
  );

  return {
    objects: [frame, ...cols],
    message: "Created Retrospective template with 3 columns",
  };
}

function generateBrainstorm(
  boardId: string,
  userId: string,
  center: { x: number; y: number }
): TemplateResult {
  const frame = makeObj(
    {
      type: "frame",
      x: center.x - 300,
      y: center.y - 250,
      width: 600,
      height: 500,
      content: "Brainstorm",
      color: "#E0E0E0",
    },
    boardId,
    userId
  );

  // 2x3 grid of empty sticky notes
  const notes: BoardObject[] = [];
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      notes.push(
        makeObj(
          {
            type: "sticky_note",
            x: center.x - 270 + col * 190,
            y: center.y - 200 + row * 220,
            width: 170,
            height: 200,
            content: "",
            color: "#FFEB3B",
            parent_frame_id: frame.id,
          },
          boardId,
          userId
        )
      );
    }
  }

  return {
    objects: [frame, ...notes],
    message: "Created Brainstorm grid with 6 sticky notes",
  };
}

function generateUserJourney(
  boardId: string,
  userId: string,
  center: { x: number; y: number }
): TemplateResult {
  const stages = ["Awareness", "Consideration", "Decision", "Retention", "Advocacy"];
  const stageW = 180;
  const gap = 15;
  const totalW = (stageW + gap) * stages.length - gap;
  const startX = center.x - totalW / 2;
  const startY = center.y - 100;

  const frame = makeObj(
    {
      type: "frame",
      x: startX - 20,
      y: startY - 40,
      width: totalW + 40,
      height: 280,
      content: "User Journey Map",
      color: "#E0E0E0",
    },
    boardId,
    userId
  );

  const stageObjs = stages.map((label, i) =>
    makeObj(
      {
        type: "sticky_note",
        x: startX + i * (stageW + gap),
        y: startY,
        width: stageW,
        height: 200,
        content: label,
        color: ["#90CAF9", "#CE93D8", "#FFE082", "#A5D6A7", "#EF9A9A"][i],
        parent_frame_id: frame.id,
      },
      boardId,
      userId
    )
  );

  return {
    objects: [frame, ...stageObjs],
    message: "Created User Journey Map with 5 stages",
  };
}

const GENERATORS: Record<
  TemplateName,
  (boardId: string, userId: string, center: { x: number; y: number }) => TemplateResult
> = {
  swot: generateSwot,
  kanban: generateKanban,
  retrospective: generateRetrospective,
  brainstorm: generateBrainstorm,
  user_journey: generateUserJourney,
};

/**
 * Generate template objects. Bypasses LLM entirely.
 */
export function generateTemplate(
  name: TemplateName,
  boardId: string,
  userId: string,
  center: { x: number; y: number }
): TemplateResult {
  return GENERATORS[name](boardId, userId, center);
}
