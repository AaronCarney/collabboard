import type { ShapeRenderer } from "./types";

const registry = new Map<string, ShapeRenderer>();

export function registerRenderer(type: string, renderer: ShapeRenderer): void {
  registry.set(type, renderer);
}

export function getRenderer(type: string): ShapeRenderer {
  const r = registry.get(type);
  if (!r) throw new Error(`No renderer registered for type: ${type}`);
  return r;
}

export function hasRenderer(type: string): boolean {
  return registry.has(type);
}
