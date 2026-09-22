import { useEffect, useState } from "react";
import { quizApi } from "@/api/quizApi";

function DownloadIcon() {
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
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}

export function UpdateButton() {
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    quizApi
      .checkForUpdate()
      .then((result) => {
        if (active) setAvailable(result.updateAvailable);
      })
      .catch(() => {
        if (active) setAvailable(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const onClick = async () => {
    setBusy(true);
    try {
      const result = await quizApi.checkForUpdate();
      setAvailable(result.updateAvailable);
      if (!result.updateAvailable || !result.latestVersion) {
        alert(`You're up to date (version ${result.currentVersion}).`);
        return;
      }
      const ok = confirm(
        `Version ${result.latestVersion} is available. You have ${result.currentVersion}. Download and open the installer?`,
      );
      if (!ok) return;
      await quizApi.downloadUpdate();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const idle =
    "border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800";
  const ready =
    "border-brand-600 bg-brand-500 text-white hover:bg-brand-600";

  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={busy}
      aria-label={available ? "Download latest version" : "Check for updates"}
      title={available ? "Download latest version" : "Check for updates"}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-wait dark:focus-visible:ring-offset-neutral-950 ${available ? ready : idle}`}
    >
      <DownloadIcon />
    </button>
  );
}
