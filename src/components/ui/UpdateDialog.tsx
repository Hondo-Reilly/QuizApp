import { useState } from "react";
import { quizApi } from "@/api/quizApi";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ReleaseNotes } from "@/components/ui/ReleaseNotes";
import { TextInput } from "@/components/ui/TextField";
import type { UpdateCheck } from "@shared/types";

const INSTALL_COMMAND = "xattr -cr /Applications/QuizApp.app";

function isMac(): boolean {
  return /Mac/i.test(navigator.platform);
}

export interface UpdateDialogProps {
  check: UpdateCheck | null;
  onClose: () => void;
}

export function UpdateDialog({ check, onClose }: UpdateDialogProps) {
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open = !!check?.updateAvailable && !!check.latestVersion;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(INSTALL_COMMAND);
    } catch {
      const input = document.getElementById("install-command");
      if (input instanceof HTMLInputElement) {
        input.focus();
        input.select();
        document.execCommand("copy");
      }
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      await quizApi.downloadUpdate();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal
      open={open}
      title={`Version ${check?.latestVersion ?? ""} is available`}
      onClose={downloading ? () => undefined : onClose}
      width="max-w-lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={downloading}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={() => void handleDownload()}
            disabled={downloading}
          >
            {downloading ? "Downloading..." : "Download and open"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-600 dark:text-neutral-400">
          You have version {check?.currentVersion}.
        </p>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-800 dark:text-neutral-200">
            Release notes
          </h3>
          <ReleaseNotes notes={check?.releaseNotes ?? null} />
        </div>
        {isMac() && (
          <div>
            <p className="mb-2 text-sm text-slate-600 dark:text-neutral-400">
              After moving QuizApp to Applications, open Terminal and run the command below. Because QuizApp is unsigned, macOS may incorrectly report that it is damaged. Signing requires a paid Apple Developer account, which I (the developer) don't currently have.
            </p>
            <div className="flex items-center gap-2">
              <TextInput
                id="install-command"
                readOnly
                value={INSTALL_COMMAND}
                aria-label="Install command"
                className="min-w-0 flex-1 font-mono"
                onFocus={(event) => event.currentTarget.select()}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => void handleCopy()}
              >
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        )}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    </Modal>
  );
}
