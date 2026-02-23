"use client";

import { useUser, useAuth, UserButton } from "@clerk/nextjs";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClerkSupabaseClient } from "@/lib/supabase";
import { showToast } from "@/lib/toast";
import type { Board } from "@/types/board";
import { FREE_TIER_BOARD_LIMIT, boardSchema } from "@collabboard/shared";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default function DashboardPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);

  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const supabase = useMemo(() => createClerkSupabaseClient(() => getTokenRef.current()), []);

  const loadBoards = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("boards")
      .select("*")
      .eq("created_by", user.id)
      .order("updated_at", { ascending: false });
    const parseResult = boardSchema.array().safeParse(data ?? []);
    setBoards(parseResult.success ? parseResult.data : []);
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    if (!user) return;
    void loadBoards();
  }, [user, loadBoards]);

  const isAtLimit = boards.length >= FREE_TIER_BOARD_LIMIT;

  const createBoard = useCallback(async () => {
    if (!user) return;
    if (boards.length >= FREE_TIER_BOARD_LIMIT) {
      showToast("Board limit reached. Delete a board to create a new one.", "error");
      return;
    }
    const result = await supabase
      .from("boards")
      .insert({ name: "Untitled Board", created_by: user.id })
      .select()
      .single();
    const parsed = boardSchema.safeParse(result.data);
    if (parsed.success) {
      router.push(`/board/${parsed.data.id}`);
    } else if (result.error) {
      showToast("Failed to create board", "error");
    }
  }, [user, router, supabase, boards.length]);

  const deleteBoard = useCallback(
    async (boardId: string) => {
      if (!window.confirm("Delete this board? This cannot be undone.")) return;
      const { error } = await supabase.from("boards").delete().eq("id", boardId);
      if (error) {
        showToast("Failed to delete board", "error");
        return;
      }
      setBoards((prev) => prev.filter((b) => b.id !== boardId));
      showToast("Board deleted", "info");
    },
    [supabase]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">CollabBoard</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.fullName}</span>
          <UserButton />
        </div>
      </header>
      <main className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">My Boards</h2>
          <button
            onClick={() => {
              void createBoard();
            }}
            disabled={isAtLimit}
            className={`bg-blue-600 text-white px-4 py-2 rounded-lg transition${isAtLimit ? " opacity-50 cursor-not-allowed" : " hover:bg-blue-700"}`}
          >
            + New Board
          </button>
        </div>
        {isAtLimit && (
          <p className="text-sm text-amber-600 mb-4">
            Free plan limit: {FREE_TIER_BOARD_LIMIT} boards. Delete a board to create a new one.
          </p>
        )}
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : boards.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-2">No boards yet</p>
            <p>Click &quot;+ New Board&quot; to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {boards.map((board) => (
              <div
                key={board.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  router.push(`/board/${board.id}`);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    router.push(`/board/${board.id}`);
                  }
                }}
                className="relative bg-white border rounded-lg p-4 text-left hover:shadow-md transition cursor-pointer"
              >
                <button
                  aria-label="Delete board"
                  onClick={(e) => {
                    e.stopPropagation();
                    void deleteBoard(board.id);
                  }}
                  className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-sm leading-none"
                >
                  ×
                </button>
                <h3 className="font-medium truncate">{board.name}</h3>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(board.updated_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
