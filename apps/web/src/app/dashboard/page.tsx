"use client";

import { useUser, useAuth, UserButton } from "@clerk/nextjs";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClerkSupabaseClient } from "@/lib/supabase";
import type { Board } from "@/types/board";

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default function DashboardPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(() => createClerkSupabaseClient(() => getToken()), [getToken]);

  const loadBoards = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("boards")
      .select("*")
      .eq("created_by", user.id)
      .order("updated_at", { ascending: false });
    setBoards(data ? (data as Board[]) : []);
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    if (!user) return;
    void loadBoards();
  }, [user, loadBoards]);

  const createBoard = useCallback(async () => {
    if (!user) return;
    const result = await supabase
      .from("boards")
      .insert({ name: "Untitled Board", created_by: user.id })
      .select()
      .single();
    if (result.data && !result.error) {
      router.push(`/board/${(result.data as Board).id}`);
    }
  }, [user, router, supabase]);

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
            onClick={() => void createBoard()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            + New Board
          </button>
        </div>
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
              <button
                key={board.id}
                onClick={() => {
                  router.push(`/board/${board.id}`);
                }}
                className="bg-white border rounded-lg p-4 text-left hover:shadow-md transition"
              >
                <h3 className="font-medium truncate">{board.name}</h3>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(board.updated_at).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
