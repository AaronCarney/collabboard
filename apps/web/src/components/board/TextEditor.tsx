'use client';

import { useEffect, useRef } from 'react';
import type { BoardObject } from '@/types/board';
import type { Camera } from '@/lib/board-store';

interface TextEditorProps {
  object: BoardObject;
  camera: Camera;
  onSave: (id: string, content: string) => void;
  onClose: () => void;
}

export function TextEditor({ object, camera, onSave, onClose }: TextEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.focus();
      ref.current.select();
    }
  }, []);

  const left = object.x * camera.zoom + camera.x;
  const top = object.y * camera.zoom + camera.y;
  const width = object.width * camera.zoom;
  const height = object.height * camera.zoom;

  return (
    <textarea
      ref={ref}
      defaultValue={object.content}
      onBlur={(e) => {
        onSave(object.id, e.target.value);
        onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose();
        }
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          onSave(object.id, e.currentTarget.value);
          onClose();
        }
      }}
      className="absolute z-50 p-3 border-2 border-blue-500 rounded-lg resize-none outline-none bg-transparent"
      style={{
        left,
        top,
        width,
        height: Math.max(height, 60),
        fontSize: `${String(14 * camera.zoom)}px`,
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      }}
    />
  );
}
