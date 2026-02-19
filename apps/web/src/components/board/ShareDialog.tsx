"use client";

import { useState, useCallback } from "react";
import { X, Link2 } from "lucide-react";
import type { AccessLevel, BoardShare } from "@collabboard/shared";
import { showToast } from "@/lib/toast";

interface ShareDialogProps {
  boardId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareDialog({
  boardId,
  isOpen,
  onClose,
}: ShareDialogProps): React.JSX.Element | null {
  const [accessLevel, setAccessLevel] = useState<AccessLevel>("view");
  const [share, setShare] = useState<BoardShare | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateLink = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ board_id: boardId, access_level: accessLevel }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to create share link");
      }

      const data = (await response.json()) as BoardShare;
      setShare(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }, [boardId, accessLevel]);

  const copyLink = useCallback(() => {
    if (!share) return;
    const url = `${window.location.origin}/board/${share.board_id}?share=${share.token}`;
    navigator.clipboard.writeText(url).then(
      () => {
        showToast("Link copied!", "success");
      },
      () => {
        showToast("Failed to copy link", "error");
      }
    );
  }, [share]);

  const revokeLink = useCallback(async () => {
    if (!share) return;
    setIsLoading(true);

    try {
      await fetch("/api/share", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ share_id: share.id }),
      });
      setShare(null);
    } catch {
      setError("Failed to revoke link");
    } finally {
      setIsLoading(false);
    }
  }, [share]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-96 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Share Board</h2>
          <button
            onClick={onClose}
            title="Close"
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <X size={18} />
          </button>
        </div>

        {/* Access Level Toggle */}
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Anyone with the link:</p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setAccessLevel("view");
              }}
              className={`flex-1 px-3 py-2 text-sm rounded-lg border transition ${
                accessLevel === "view"
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              Can view
            </button>
            <button
              onClick={() => {
                setAccessLevel("edit");
              }}
              className={`flex-1 px-3 py-2 text-sm rounded-lg border transition ${
                accessLevel === "edit"
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              Can edit
            </button>
          </div>
        </div>

        {/* Error */}
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        {/* Generated Link */}
        {share ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
              <Link2 size={16} className="text-gray-400 shrink-0" />
              <span className="text-sm text-gray-700 truncate">
                ...?share={share.token.slice(0, 8)}...
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={copyLink}
                className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-1.5"
              >
                Copy Link
              </button>
              <button
                onClick={() => void revokeLink()}
                disabled={isLoading}
                className="px-3 py-2 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
              >
                Revoke
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => void generateLink()}
            disabled={isLoading}
            className="w-full px-3 py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {isLoading ? "Generating..." : "Generate Link"}
          </button>
        )}
      </div>
    </div>
  );
}
