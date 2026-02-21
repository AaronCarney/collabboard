# Spec: AI Agent Upgrade

## Feature Description

Upgrade CollabBoard's AI command system from basic GPT-4o-mini integration to a production-quality pipeline with semantic colors, input validation, new tools (connector + delete), 3-tier context serialization, collision post-processing, selection awareness, session memory, enhanced templates, Cmd+K UX, categorized errors, batch undo, and per-user queuing.

## Acceptance Criteria

### Phase 1: Tool & Schema Improvements

**AC-1: Semantic Color System**

- Given the AI creates a sticky note with `color: "blue"`
- When the tool executor runs
- Then the BoardObject color field is `#90CAF9` (resolved from named palette)
- And invalid color names fall back to type-specific defaults (yellow for sticky, lightblue for shape, gray for frame)

**AC-2: Validation & Clamping Layer**

- Given the LLM returns `width: 99999` or `x: -100000`
- When validation runs before tool execution
- Then dimensions are clamped to 10-5000px and positions to -50000..50000
- And string-typed numbers (e.g., `"100"`) are coerced to number type
- And tool calls referencing non-existent objectIds return `valid: false`

**AC-3: Connector and Delete Tools**

- Given the user says "connect A to B"
- When the LLM calls `create_connector` with valid from/to UUIDs
- Then a BoardObject of type `connector` is created with correct `connectorPropertiesSchema` fields
- And `delete_object` removes an object by ID, returning a deletion marker (not a BoardObject)
- And the step count limit is raised from 5 to 20

### Phase 2: Context Engineering

**AC-4: 3-Tier Board State Serialization**

- Given a board with 60 objects, 2 selected, 15 in viewport
- When the system prompt is built
- Then selected objects appear first with full detail (primacy)
- And viewport objects appear sorted by distance to center
- And nearby objects appear in brief format (id, type, position, text snippet)
- And distant objects are summarized as a count
- And template/blind-create commands skip board state entirely

**AC-5: Enhanced System Prompt**

- Given any AI command execution
- When the system prompt is assembled
- Then it contains: Role, Coordinate System, Color Palette, Rules, Out of Scope, Board State, and Current Selection sections
- And tool descriptions follow "Tool to X. Use when Y." format

**AC-6: Collision Detection Post-Processor**

- Given the LLM creates 5 overlapping sticky notes
- When the collision resolver runs after all tool calls
- Then all AI-created objects are pushed apart with ≥20px gaps
- And existing user objects are never moved (treated as fixed)
- And the algorithm converges within 30 iterations

### Phase 3: Selection, Memory & Templates

**AC-7: Selection-Aware Context**

- Given the user selects 3 objects and says "arrange these in a grid"
- When the command is processed
- Then selected objects are serialized at full detail before viewport objects
- And the system prompt includes behavior rules for selection references ("these"/"them")

**AC-8: Session Memory (Anaphora Resolution)**

- Given the user creates a sticky note, then says "make it blue"
- When anaphora resolution runs
- Then "it" resolves to the last-created object ID
- And "them"/"those" resolve to all last-created IDs
- And sessions expire after 5 minutes (TTL)

**AC-9: Enhanced Template Router**

- Given the user says "strengths and weaknesses analysis"
- When template matching runs
- Then it matches the SWOT template (fuzzy multi-phrase pattern)
- And "to do doing done" matches kanban
- And "start stop continue" matches retrospective
- And ambiguous phrases like "what are my strengths" do NOT match (route to LLM)

### Phase 4: UX & Integration

**AC-10: Command Bar UX**

- Given the user presses Cmd+K (or Ctrl+K)
- When the key handler fires
- Then the AI command bar opens and auto-focuses the input
- And Escape closes the bar
- And response messages auto-fade after 3 seconds

**AC-11: Categorized Error Handling**

- Given the LLM returns zero tool calls
- When error classification runs
- Then the error category is `no_understand` with a user-friendly message
- And 429/5xx responses classify as `service_unavailable`
- And mixed success/failure tool results classify as `partial_failure`

**AC-12: Batch Undo + Per-User Queuing**

- Given the AI creates 5 objects from one command
- When the user presses Ctrl+Z
- Then all 5 objects are removed in a single undo step (via `createMultiObjectCommand`)
- And `pushWithoutExecuting` records to history without calling execute (avoids double-broadcast)
- And rapid commands from the same user are serialized (per-user queue)
- And commands from different users execute in parallel

## Out of Scope

- Multi-agent/multi-model routing
- AI cursor / NPC presence
- Conversation history beyond 5-min anaphora cache
- Plan preview before execution
- Self-correction retry loops
- Streaming tool call application
- Canvas linting system

## Dependencies

- Vercel AI SDK 6 (`ai@6.0.91`, `@ai-sdk/openai@3.0.30`) — already installed
- `connectorPropertiesSchema` — already defined in board object schemas
- `createMultiObjectCommand` — already implemented in `board-commands.ts`
- `SpatialIndex` — exists in `spatial-index.ts` (optional optimization for collision)

## Performance Requirements

- Template commands: <50ms (no LLM call)
- Single-step LLM commands: <2s end-to-end
- Multi-step LLM commands (up to 20 steps): <10s
- Collision resolution: <50ms for up to 20 objects
- Context serialization: <10ms for up to 200 objects
