"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface AiCommandBarProps {
  onSubmit: (command: string) => void;
  isLoading: boolean;
  resultPreview?: string;
  onClose?: () => void;
}

export function AiCommandBar({
  onSubmit,
  isLoading,
  resultPreview,
  onClose,
}: AiCommandBarProps): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [showResult, setShowResult] = useState(!!resultPreview);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isExpanded) {
      inputRef.current?.focus();
    }
  }, [isExpanded]);

  useEffect(() => {
    if (resultPreview) {
      setShowResult(true);
      const timer = setTimeout(() => {
        setShowResult(false);
      }, 3000);
      return () => {
        clearTimeout(timer);
      };
    }
    setShowResult(false);
    return undefined;
  }, [resultPreview]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        onClose?.();
        return;
      }
      if (e.key === "Enter" && inputValue.trim()) {
        onSubmit(inputValue);
        setInputValue("");
      }
    },
    [inputValue, onSubmit, onClose]
  );

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
      {/* Result Preview */}
      {resultPreview && showResult && isExpanded && (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 max-w-md">
          {resultPreview}
        </div>
      )}

      {/* Command Bar */}
      <div className="flex items-center gap-2">
        <button
          aria-label="Toggle AI command bar"
          onClick={() => {
            setIsExpanded((prev) => !prev);
          }}
          className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-md border border-gray-200 text-gray-500 hover:bg-gray-50 transition text-sm"
        >
          {isExpanded ? "▼" : "▲"}
        </button>

        {isExpanded && (
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder="Type / for AI commands..."
              className="w-80 px-4 py-2 bg-white rounded-lg shadow-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {isLoading && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-600 font-medium">
                Processing...
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
