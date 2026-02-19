"use client";

import type React from "react";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function BoardError({ error, reset }: ErrorBoundaryProps): React.JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="mx-auto max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Something went wrong</h2>
        <p className="mb-6 text-sm text-gray-600">
          An error occurred while loading the board. Please try again.
        </p>
        {process.env.NODE_ENV === "development" && (
          <pre className="mb-6 overflow-auto rounded bg-gray-100 p-3 text-left text-xs text-red-600">
            {error.message}
          </pre>
        )}
        <button
          onClick={reset}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
