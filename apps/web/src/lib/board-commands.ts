import type { BoardObject } from "@collabboard/shared";

/** Command pattern for undo/redo support. */
export interface UndoableCommand {
  /** Human-readable description for UI (e.g., "Move 3 objects"). */
  description: string;
  /** Execute the command — applies the forward mutation. */
  execute(): void;
  /** Reverse the command — applies the inverse mutation. */
  undo(): void;
}

/** Abstraction over the board store's mutation operations. */
export interface MutationPipeline {
  upsertObjects(objects: BoardObject[]): void;
  removeObjects(ids: string[]): void;
  getObject(id: string): BoardObject | null;
}

const HISTORY_CAP = 50;

export interface CommandHistory {
  execute(cmd: UndoableCommand): void;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  clear(): void;
}

export function createCommandHistory(): CommandHistory {
  const past: UndoableCommand[] = [];
  const future: UndoableCommand[] = [];

  return {
    execute(cmd: UndoableCommand) {
      cmd.execute();
      past.push(cmd);
      future.length = 0;
      if (past.length > HISTORY_CAP) {
        past.shift();
      }
    },
    undo() {
      const cmd = past.pop();
      if (!cmd) return;
      cmd.undo();
      future.push(cmd);
    },
    redo() {
      const cmd = future.pop();
      if (!cmd) return;
      cmd.execute();
      past.push(cmd);
    },
    canUndo() {
      return past.length > 0;
    },
    canRedo() {
      return future.length > 0;
    },
    clear() {
      past.length = 0;
      future.length = 0;
    },
  };
}

// ─────────────────────────────────────────────────────────────
// Command Factories
// ─────────────────────────────────────────────────────────────

export function createCreateCommand(
  object: BoardObject,
  pipeline: MutationPipeline
): UndoableCommand {
  return {
    description: `Create ${object.type}`,
    execute() {
      pipeline.upsertObjects([object]);
    },
    undo() {
      pipeline.removeObjects([object.id]);
    },
  };
}

export function createDeleteCommand(
  snapshot: BoardObject,
  pipeline: MutationPipeline
): UndoableCommand {
  return {
    description: `Delete ${snapshot.type}`,
    execute() {
      pipeline.removeObjects([snapshot.id]);
    },
    undo() {
      pipeline.upsertObjects([snapshot]);
    },
  };
}

export interface MoveDelta {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

export function createMoveCommand(moves: MoveDelta[], pipeline: MutationPipeline): UndoableCommand {
  const count = moves.length;
  return {
    description: count === 1 ? "Move object" : `Move ${String(count)} objects`,
    execute() {
      for (const m of moves) {
        const obj = pipeline.getObject(m.id);
        if (!obj) continue; // guard: skip if deleted remotely
        pipeline.upsertObjects([{ ...obj, x: m.toX, y: m.toY }]);
      }
    },
    undo() {
      for (const m of moves) {
        const obj = pipeline.getObject(m.id);
        if (!obj) continue; // guard: skip if deleted remotely
        pipeline.upsertObjects([{ ...obj, x: m.fromX, y: m.fromY }]);
      }
    },
  };
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function createResizeCommand(
  id: string,
  fromBounds: Bounds,
  toBounds: Bounds,
  pipeline: MutationPipeline
): UndoableCommand {
  return {
    description: "Resize object",
    execute() {
      const obj = pipeline.getObject(id);
      if (!obj) return;
      pipeline.upsertObjects([{ ...obj, ...toBounds }]);
    },
    undo() {
      const obj = pipeline.getObject(id);
      if (!obj) return;
      pipeline.upsertObjects([{ ...obj, ...fromBounds }]);
    },
  };
}

export function createEditTextCommand(
  id: string,
  oldContent: string,
  newContent: string,
  pipeline: MutationPipeline
): UndoableCommand {
  return {
    description: "Edit text",
    execute() {
      const obj = pipeline.getObject(id);
      if (!obj) return;
      pipeline.upsertObjects([{ ...obj, content: newContent }]);
    },
    undo() {
      const obj = pipeline.getObject(id);
      if (!obj) return;
      pipeline.upsertObjects([{ ...obj, content: oldContent }]);
    },
  };
}

export function createChangeColorCommand(
  id: string,
  oldColor: string,
  newColor: string,
  pipeline: MutationPipeline
): UndoableCommand {
  return {
    description: "Change color",
    execute() {
      const obj = pipeline.getObject(id);
      if (!obj) return;
      pipeline.upsertObjects([{ ...obj, color: newColor }]);
    },
    undo() {
      const obj = pipeline.getObject(id);
      if (!obj) return;
      pipeline.upsertObjects([{ ...obj, color: oldColor }]);
    },
  };
}

export function createMultiObjectCommand(
  description: string,
  commands: UndoableCommand[]
): UndoableCommand {
  return {
    description,
    execute() {
      for (const cmd of commands) {
        cmd.execute();
      }
    },
    undo() {
      for (let i = commands.length - 1; i >= 0; i--) {
        commands[i].undo();
      }
    },
  };
}
