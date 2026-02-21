"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { UserButton } from "@clerk/nextjs";
import { useBoardContext } from "./BoardContext";

interface MenuBarProps {
  boardName: string;
  onBoardNameChange: (name: string) => void;
  onShareClick?: () => void;
  onShowShortcuts?: () => void;
}

interface MenuItem {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  onClick?: () => void;
}

type MenuId = "file" | "edit" | "view" | null;

const MIN_ZOOM = 0.02;
const MAX_ZOOM = 20;
const ZOOM_STEP = 1.2;

export function MenuBar({
  boardName,
  onBoardNameChange,
  onShareClick,
  onShowShortcuts,
}: MenuBarProps): React.JSX.Element {
  const ctx = useBoardContext();
  const [openMenu, setOpenMenu] = useState<MenuId>(null);
  const [nameValue, setNameValue] = useState(boardName);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNameValue(boardName);
  }, [boardName]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    if (openMenu) {
      document.addEventListener("click", handleClickOutside, true);
    }
    return () => {
      document.removeEventListener("click", handleClickOutside, true);
    };
  }, [openMenu]);

  const handleNameBlur = useCallback(() => {
    if (nameValue.trim() && nameValue !== boardName) {
      onBoardNameChange(nameValue);
    }
  }, [nameValue, boardName, onBoardNameChange]);

  const toggleMenu = useCallback((menu: MenuId) => {
    setOpenMenu((prev) => (prev === menu ? null : menu));
  }, []);

  const closeMenu = useCallback(() => {
    setOpenMenu(null);
  }, []);

  const fileItems: MenuItem[] = [
    { label: "New Board", onClick: closeMenu },
    { label: "Duplicate Board", onClick: closeMenu },
    { label: "Export as PNG", onClick: closeMenu },
  ];

  const editItems: MenuItem[] = [
    {
      label: "Undo",
      shortcut: "Ctrl+Z",
      disabled: ctx.readOnly || !ctx.canUndo,
      onClick: () => {
        ctx.undo();
        setOpenMenu(null);
      },
    },
    {
      label: "Redo",
      shortcut: "Ctrl+Shift+Z",
      disabled: ctx.readOnly || !ctx.canRedo,
      onClick: () => {
        ctx.redo();
        setOpenMenu(null);
      },
    },
    {
      label: "Select All",
      shortcut: "Ctrl+A",
      onClick: closeMenu,
    },
    {
      label: "Delete Selected",
      shortcut: "Del",
      disabled: ctx.readOnly,
      onClick: () => {
        ctx.deleteSelected();
        setOpenMenu(null);
      },
    },
    {
      label: "Copy",
      shortcut: "Ctrl+C",
      onClick: () => {
        ctx.copySelected();
        setOpenMenu(null);
      },
    },
    {
      label: "Paste",
      shortcut: "Ctrl+V",
      disabled: ctx.readOnly,
      onClick: () => {
        ctx.pasteFromClipboard();
        setOpenMenu(null);
      },
    },
    {
      label: "Duplicate",
      shortcut: "Ctrl+D",
      disabled: ctx.readOnly,
      onClick: () => {
        ctx.duplicateSelected();
        setOpenMenu(null);
      },
    },
  ];

  const viewItems: MenuItem[] = [
    {
      label: "Zoom In",
      shortcut: "Ctrl++",
      onClick: () => {
        ctx.setZoom(Math.min(MAX_ZOOM, ctx.zoom * ZOOM_STEP));
        setOpenMenu(null);
      },
    },
    {
      label: "Zoom Out",
      shortcut: "Ctrl+-",
      onClick: () => {
        ctx.setZoom(Math.max(MIN_ZOOM, ctx.zoom / ZOOM_STEP));
        setOpenMenu(null);
      },
    },
    {
      label: "Fit to Screen",
      onClick: () => {
        ctx.fitToScreen();
        setOpenMenu(null);
      },
    },
    {
      label: ctx.gridVisible ? "Hide Grid" : "Show Grid",
      onClick: () => {
        ctx.toggleGrid();
        setOpenMenu(null);
      },
    },
    {
      label: "Keyboard Shortcuts",
      shortcut: "?",
      onClick: () => {
        onShowShortcuts?.();
        setOpenMenu(null);
      },
    },
  ];

  const zoomPercent = Math.round(ctx.zoom * 100);

  const handleZoomOut = useCallback(() => {
    ctx.setZoom(Math.max(MIN_ZOOM, ctx.zoom / ZOOM_STEP));
  }, [ctx]);

  const handleZoomIn = useCallback(() => {
    ctx.setZoom(Math.min(MAX_ZOOM, ctx.zoom * ZOOM_STEP));
  }, [ctx]);

  return (
    <div
      ref={menuRef}
      className="absolute top-0 left-0 right-0 z-50 flex items-center h-12 bg-white border-b border-gray-200 px-2 gap-1 shadow-sm"
    >
      {/* Board Name */}
      <input
        type="text"
        value={nameValue}
        readOnly={ctx.readOnly}
        onChange={(e) => {
          setNameValue(e.target.value);
        }}
        onBlur={handleNameBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
        className={`text-sm font-semibold bg-transparent border border-transparent rounded px-2 py-1 w-40 truncate ${
          ctx.readOnly
            ? "cursor-default"
            : "hover:border-gray-300 focus:border-blue-500 focus:outline-none"
        }`}
      />

      {/* Menu Triggers */}
      <div className="flex items-center gap-0.5 ml-2">
        <MenuTrigger
          label="File"
          isOpen={openMenu === "file"}
          onClick={() => {
            toggleMenu("file");
          }}
          items={fileItems}
        />
        <MenuTrigger
          label="Edit"
          isOpen={openMenu === "edit"}
          onClick={() => {
            toggleMenu("edit");
          }}
          items={editItems}
        />
        <MenuTrigger
          label="View"
          isOpen={openMenu === "view"}
          onClick={() => {
            toggleMenu("view");
          }}
          items={viewItems}
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Zoom Controls */}
      <div className="flex items-center gap-1 bg-gray-50 rounded-lg px-2 py-1">
        <button
          aria-label="Zoom out"
          onClick={handleZoomOut}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 text-gray-600 text-sm"
        >
          −
        </button>
        <span className="text-xs font-medium text-gray-700 w-10 text-center">{zoomPercent}%</span>
        <button
          aria-label="Zoom in"
          onClick={handleZoomIn}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 text-gray-600 text-sm"
        >
          +
        </button>
      </div>

      {/* Share Button — hidden for read-only viewers */}
      {!ctx.readOnly && (
        <button
          onClick={onShareClick}
          className="ml-2 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
        >
          Share
        </button>
      )}

      {/* User Menu */}
      <div className="ml-2">
        <UserButton />
      </div>
    </div>
  );
}

/* ---------- Dropdown menu trigger + panel ---------- */

interface MenuTriggerProps {
  label: string;
  isOpen: boolean;
  onClick: () => void;
  items: MenuItem[];
}

function MenuTrigger({ label, isOpen, onClick, items }: MenuTriggerProps): React.JSX.Element {
  return (
    <div className="relative">
      <button
        onClick={onClick}
        className={`px-2.5 py-1 text-sm rounded transition ${
          isOpen
            ? "bg-gray-100 text-gray-900"
            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        }`}
      >
        {label}
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-0.5 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-48 z-50">
          {items.map((item) => (
            <button
              key={item.label}
              disabled={item.disabled}
              onClick={item.onClick}
              className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-left hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>{item.label}</span>
              {item.shortcut && <span className="text-xs text-gray-400 ml-4">{item.shortcut}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
