import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface ContextMenuItem {
  label: string;
  onSelect: () => void;
}

export interface ContextMenuProps {
  /** Where the pointer was, in viewport pixels. Null keeps the menu closed. */
  position: { x: number; y: number } | null;
  label: string;
  items: ContextMenuItem[];
  onClose: () => void;
}

const EDGE = 8;

/** A right-click menu at the pointer, kept inside the window. */
export function ContextMenu({ position, label, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [placed, setPlaced] = useState<{ left: number; top: number } | null>(null);

  // Measure first, then flip or nudge so the whole menu stays on screen.
  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!position || !menu) {
      setPlaced(null);
      return;
    }
    const { width, height } = menu.getBoundingClientRect();
    const maxLeft = window.innerWidth - width - EDGE;
    const maxTop = window.innerHeight - height - EDGE;
    const left = position.x > maxLeft ? Math.max(EDGE, position.x - width) : position.x;
    const top = position.y > maxTop ? Math.max(EDGE, position.y - height) : position.y;
    setPlaced({ left, top });
  }, [position]);

  // Focus once the menu is placed; a hidden menu can't take focus.
  useEffect(() => {
    if (placed) itemRefs.current[0]?.focus();
  }, [placed]);

  useEffect(() => {
    if (!position) return;
    const onPointer = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onClose();
    };
    const close = () => onClose();
    document.addEventListener("pointerdown", onPointer, true);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("blur", close);
    return () => {
      document.removeEventListener("pointerdown", onPointer, true);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("blur", close);
    };
  }, [position, onClose]);

  if (!position) return null;

  const onKeyDown = (event: React.KeyboardEvent) => {
    const buttons = itemRefs.current.filter((item): item is HTMLButtonElement => !!item);
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "Escape" || event.key === "Tab") {
      event.preventDefault();
      onClose();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      buttons[(index + step + buttons.length) % buttons.length]?.focus();
    }
  };

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label={label}
      onKeyDown={onKeyDown}
      onContextMenu={(event) => event.preventDefault()}
      style={{
        left: placed?.left ?? position.x,
        top: placed?.top ?? position.y,
        visibility: placed ? "visible" : "hidden",
      }}
      className="fixed z-50 min-w-[12rem] rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
    >
      {items.map((item, index) => (
        <button
          key={item.label}
          ref={(el) => {
            itemRefs.current[index] = el;
          }}
          type="button"
          role="menuitem"
          // Hover moves focus, so only one item is ever highlighted.
          onPointerMove={(event) => event.currentTarget.focus()}
          onClick={() => {
            onClose();
            item.onSelect();
          }}
          className="flex w-full items-center rounded-md px-3 py-1.5 text-left text-sm text-slate-800 focus:bg-slate-100 focus:outline-none dark:text-neutral-100 dark:focus:bg-neutral-800"
        >
          {item.label}
        </button>
      ))}
    </div>,
    document.body,
  );
}
