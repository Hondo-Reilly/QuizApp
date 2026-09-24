import { useState } from "react";
import { quizApi } from "@/api/quizApi";
import { useAccent } from "@/hooks/useAccent";
import { ACCENTS } from "@/lib/accent";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

function GearIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

export function SettingsButton() {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { accent, setAccent } = useAccent();

  const close = () => {
    if (busy) return;
    setOpen(false);
    setConfirming(false);
    setError(null);
  };

  const deleteAll = async () => {
    setBusy(true);
    setError(null);
    try {
      await quizApi.deleteAllAppData();
      window.location.hash = "#/";
      window.location.reload();
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Could not delete app data.");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Settings"
        title="Settings"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800 dark:focus-visible:ring-offset-neutral-950"
      >
        <GearIcon />
      </button>
      <Modal
        open={open}
        title={confirming ? "Delete all app data?" : "Settings"}
        onClose={close}
        footer={
          confirming ? (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setConfirming(false);
                  setError(null);
                }}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button type="button" variant="danger" onClick={() => void deleteAll()} disabled={busy}>
                Delete all app data
              </Button>
            </>
          ) : undefined
        }
      >
        {confirming ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-slate-600 dark:text-neutral-400">
              Imported quizzes, quiz attempts, and saved settings will be removed. This
              cannot be undone.
            </p>
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <span
                id="accent-color-label"
                className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-neutral-400"
              >
                Accent color
              </span>
              <div
                role="radiogroup"
                aria-labelledby="accent-color-label"
                className="flex flex-wrap gap-2"
              >
                {ACCENTS.map((option) => {
                  const selected = option.id === accent;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={option.label}
                      title={option.label}
                      onClick={() => setAccent(option.id)}
                      className={`h-7 w-7 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-950 ${
                        selected
                          ? "ring-2 ring-slate-900 ring-offset-2 ring-offset-white dark:ring-neutral-100 dark:ring-offset-neutral-900"
                          : ""
                      }`}
                      style={{ backgroundColor: `rgb(var(--swatch-${option.id}))` }}
                    />
                  );
                })}
              </div>
            </div>
            <div className="border-t border-slate-200 pt-4 dark:border-neutral-800">
              <Button type="button" variant="danger" onClick={() => setConfirming(true)}>
                Delete all app data
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
