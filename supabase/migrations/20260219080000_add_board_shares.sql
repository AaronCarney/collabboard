-- Phase 5A: Board sharing via links
-- board_shares stores share tokens with access levels

CREATE TABLE IF NOT EXISTS board_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  access_level text NOT NULL CHECK (access_level IN ('view', 'edit')),
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

-- Index for token lookups (share link validation)
CREATE INDEX IF NOT EXISTS idx_board_shares_token ON board_shares(token);

-- Index for listing shares by board
CREATE INDEX IF NOT EXISTS idx_board_shares_board_id ON board_shares(board_id);

-- RLS: only board owner can manage shares
ALTER TABLE board_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY board_shares_select ON board_shares
  FOR SELECT USING (auth.uid()::text = created_by);

CREATE POLICY board_shares_insert ON board_shares
  FOR INSERT WITH CHECK (auth.uid()::text = created_by);

CREATE POLICY board_shares_delete ON board_shares
  FOR DELETE USING (auth.uid()::text = created_by);
