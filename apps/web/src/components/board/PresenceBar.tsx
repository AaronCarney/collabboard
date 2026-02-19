"use client";

import type { PresenceUser } from "@/types/board";

interface PresenceBarProps {
  users: PresenceUser[];
  currentUserId: string;
}

export function PresenceBar({ users, currentUserId }: PresenceBarProps): React.JSX.Element {
  return (
    <div className="absolute top-14 right-4 flex items-center gap-2 z-50">
      {users.map((user) => (
        <div
          key={user.userId}
          className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 shadow-sm border text-sm"
        >
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: user.color }} />
          <span className="font-medium text-gray-700">
            {user.userId === currentUserId ? "You" : user.userName}
          </span>
        </div>
      ))}
    </div>
  );
}
