import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";

export interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  width = "max-w-md",
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
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
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`flex max-h-full w-full ${width} flex-col gap-4 overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-neutral-800 dark:bg-neutral-900`}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-neutral-100">
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
