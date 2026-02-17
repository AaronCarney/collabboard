'use client';

import type { ObjectType } from '@/types/board';
import { clsx } from 'clsx';

interface ToolBarProps {
  activeTool: ObjectType | 'select';
  onToolChange: (tool: ObjectType | 'select') => void;
  onDelete: () => void;
  hasSelection: boolean;
}

const tools: { id: ObjectType | 'select'; label: string; icon: string }[] = [
  { id: 'select', label: 'Select', icon: '↖' },
  { id: 'sticky_note', label: 'Sticky Note', icon: '📋' },
  { id: 'rectangle', label: 'Rectangle', icon: '⬜' },
  { id: 'circle', label: 'Circle', icon: '⭕' },
  { id: 'text', label: 'Text', icon: 'T' },
];

export function ToolBar({ activeTool, onToolChange, onDelete, hasSelection }: ToolBarProps) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-lg border flex items-center gap-1 px-2 py-1.5 z-50">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => onToolChange(tool.id)}
          title={tool.label}
          className={clsx(
            'w-10 h-10 flex items-center justify-center rounded-lg text-lg transition',
            activeTool === tool.id
              ? 'bg-blue-100 text-blue-700'
              : 'hover:bg-gray-100 text-gray-600'
          )}
        >
          {tool.icon}
        </button>
      ))}
      <div className="w-px h-8 bg-gray-200 mx-1" />
      <button
        onClick={onDelete}
        disabled={!hasSelection}
        title="Delete"
        className={clsx(
          'w-10 h-10 flex items-center justify-center rounded-lg text-lg transition',
          hasSelection ? 'hover:bg-red-100 text-red-500' : 'text-gray-300 cursor-not-allowed'
        )}
      >
        🗑
      </button>
    </div>
  );
}
