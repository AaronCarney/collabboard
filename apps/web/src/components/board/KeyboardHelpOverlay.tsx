"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface KeyboardHelpOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutEntry {
  keys: string[];
  description: string;
}

const shortcuts: ShortcutEntry[] = [
  { keys: ["V"], description: "Select tool" },
  { keys: ["H"], description: "Pan tool" },
  { keys: ["Space"], description: "Hold to scroll canvas" },
  { keys: ["R"], description: "Rectangle" },
  { keys: ["E"], description: "Ellipse" },
  { keys: ["S"], description: "Sticky note" },
  { keys: ["T"], description: "Text" },
  { keys: ["D"], description: "Diamond" },
  { keys: ["P"], description: "Pencil / freehand" },
  { keys: ["L"], description: "Connector line" },
  { keys: ["F"], description: "Frame" },
  { keys: ["Del / Backspace"], description: "Delete selected" },
  { keys: ["Escape"], description: "Deselect / cancel" },
  { keys: ["Ctrl", "A"], description: "Select all" },
  { keys: ["Ctrl", "C"], description: "Copy" },
  { keys: ["Ctrl", "V"], description: "Paste" },
  { keys: ["Ctrl", "D"], description: "Duplicate" },
  { keys: ["Ctrl", "Z"], description: "Undo" },
  { keys: ["Ctrl", "Shift", "Z"], description: "Redo" },
  { keys: ["/"], description: "AI command bar" },
  { keys: ["?"], description: "Show this help" },
];

export function KeyboardHelpOverlay({
  isOpen,
  onClose,
}: KeyboardHelpOverlayProps): React.JSX.Element | null {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-[480px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <X size={18} />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="overflow-y-auto px-6 py-4">
          <div className="space-y-2">
            {shortcuts.map((shortcut) => (
              <div key={shortcut.description} className="flex items-center justify-between py-1.5">
                <span className="text-sm text-gray-600">{shortcut.description}</span>
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((key, i) => (
                    <span key={i}>
                      {i > 0 && <span className="text-gray-300 mx-0.5">+</span>}
                      <kbd className="inline-block px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs font-mono text-gray-700 min-w-[28px] text-center">
                        {key}
                      </kbd>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
