import { MousePointerClick, Sparkles, Keyboard, Move, X } from "lucide-react";

interface EmptyBoardHintProps {
  boardId?: string;
  onDismiss: () => void;
}

export function EmptyBoardHint({
  boardId: _boardId,
  onDismiss,
}: EmptyBoardHintProps): React.JSX.Element {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 p-8 max-w-sm text-center">
        <button
          aria-label="Dismiss"
          onClick={onDismiss}
          className="pointer-events-auto absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition"
        >
          <X size={14} />
        </button>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Welcome to your board</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-center gap-3">
            <MousePointerClick size={18} className="text-blue-500 shrink-0" />
            <span>Pick a tool from the sidebar to start creating</span>
          </div>
          <div className="flex items-center gap-3">
            <Move size={18} className="text-orange-500 shrink-0" />
            <span>Hold Space and drag to pan around the canvas</span>
          </div>
          <div className="flex items-center gap-3">
            <Sparkles size={18} className="text-purple-500 shrink-0" />
            <span>Type / for AI commands</span>
          </div>
          <div className="flex items-center gap-3">
            <Keyboard size={18} className="text-green-500 shrink-0" />
            <span>Press ? for keyboard shortcuts</span>
          </div>
        </div>
      </div>
    </div>
  );
}
