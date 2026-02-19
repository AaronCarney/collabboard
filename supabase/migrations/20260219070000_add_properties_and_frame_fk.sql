-- Phase 3: Add properties JSONB column, parent_frame_id FK, and updated type constraints
-- Idempotent: uses IF NOT EXISTS / IF EXISTS throughout

-- Add properties column for type-specific data (JSONB discriminated union)
ALTER TABLE board_objects
  ADD COLUMN IF NOT EXISTS properties jsonb NOT NULL DEFAULT '{}';

-- Add parent_frame_id for frame containment (ON DELETE SET NULL orphans children)
ALTER TABLE board_objects
  ADD COLUMN IF NOT EXISTS parent_frame_id uuid REFERENCES board_objects(id) ON DELETE SET NULL;

-- Update type check constraint to include new object types
ALTER TABLE board_objects
  DROP CONSTRAINT IF EXISTS board_objects_type_check;
ALTER TABLE board_objects
  ADD CONSTRAINT board_objects_type_check
    CHECK (type IN ('sticky_note', 'rectangle', 'circle', 'text', 'line', 'connector', 'frame'));

-- Index for efficient frame children lookups
CREATE INDEX IF NOT EXISTS idx_board_objects_parent_frame
  ON board_objects(parent_frame_id) WHERE parent_frame_id IS NOT NULL;

-- GIN index for connector property lookups (from_object_id, to_object_id)
CREATE INDEX IF NOT EXISTS idx_board_objects_props_connector
  ON board_objects USING GIN (properties) WHERE type = 'connector';
