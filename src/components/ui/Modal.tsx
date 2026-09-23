import { ReactNode, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

export interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function focusableIn(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1,
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  width = "max-w-md",
}: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  if (open && !wasOpen.current) {
    previousFocus.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }
  wasOpen.current = open;

  useEffect(() => {
    if (!open) {
      const previous = previousFocus.current;
      previousFocus.current = null;
      if (previous?.isConnected) previous.focus();
      return;
    }
    const dialog = dialogRef.current;
    if (!dialog) return;
    const current = document.activeElement;
    if (current instanceof HTMLElement && dialog.contains(current)) return;
    const first = focusableIn(dialog)[0];
    (first ?? dialog).focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const items = focusableIn(dialog);
      if (items.length === 0) {
        e.preventDefault();
        dialog.focus();
        return;
      }
      const index = items.indexOf(document.activeElement as HTMLElement);
      const nextIndex = e.shiftKey
        ? index <= 0
          ? items.length - 1
          : index - 1
        : index === items.length - 1 || index === -1
          ? 0
          : index + 1;
      e.preventDefault();
      items[nextIndex]?.focus();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const { body } = document;
    const previous = {
      html: html.style.overflow,
      body: body.style.overflow,
    };
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = previous.html;
      body.style.overflow = previous.body;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`flex max-h-full w-full ${width} flex-col gap-4 overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-xl outline-none dark:border-neutral-800 dark:bg-neutral-900`}
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            id={titleId}
            className="text-lg font-semibold text-slate-900 dark:text-neutral-100"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            &times;
          </button>
        </div>
        <div>{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  );
}
