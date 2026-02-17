export type ObjectType = 'sticky_note' | 'rectangle' | 'circle' | 'text';

export interface BoardObject {
  id: string;
  board_id: string;
  type: ObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  content: string;
  color: string;
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Board {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CursorPosition {
  userId: string;
  userName: string;
  x: number;
  y: number;
  color: string;
}

export interface PresenceUser {
  userId: string;
  userName: string;
  color: string;
  onlineAt: string;
}

export const OBJECT_DEFAULTS: Record<ObjectType, Partial<BoardObject>> = {
  sticky_note: { width: 200, height: 200, color: '#FFEB3B', content: 'New note' },
  rectangle: { width: 200, height: 150, color: '#42A5F5', content: '' },
  circle: { width: 150, height: 150, color: '#66BB6A', content: '' },
  text: { width: 200, height: 40, color: 'transparent', content: 'Text' },
};

export const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F0B27A', '#82E0AA',
];
