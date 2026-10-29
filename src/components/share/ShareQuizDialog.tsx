import { useEffect, useState } from "react";
import { quizApi } from "@/api/quizApi";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { errorText, formatDay, liveShare, shareExpiresSoon } from "@/lib/shareText";
import { formatShareCode, hasUnpublishedChanges } from "@shared/cloudShare";
import type { QuizMetadata } from "@shared/types";

export interface ShareQuizDialogProps {
  open: boolean;
  quiz: QuizMetadata | null;
  onClose: () => void;
  /** Reloads the library after the share changed. */
  onChanged: () => Promise<void>;
}

type Action = "share" | "publish" | "extend" | "stop";

const busyLabels: Record<Action, string> = {
  share: "Sharing…",
  publish: "Publishing…",
  extend: "Extending…",
  stop: "Stopping…",
};

const noteClass = "text-sm text-slate-600 dark:text-neutral-400";

export function ShareQuizDialog({ open, quiz, onClose, onChanged }: ShareQuizDialogProps) {
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setBusy(null);
      setError(null);
      setCopied(false);
    }
  }, [open, quiz?.id]);

  if (!quiz) return null;
  const share = liveShare(quiz);
  const lapsed = !!quiz.share && !share;
  const unpublished = !!share && hasUnpublishedChanges(quiz);

  const act = async (action: Action, work: () => Promise<unknown>) => {
    setBusy(action);
    setError(null);
    try {
      await work();
    } catch (err) {
      setError(errorText(err));
    } finally {
      // The share changed or was found lapsed either way.
      await onChanged().catch(() => undefined);
      setBusy(null);
    }
  };

  const stopSharing = () => {
    if (
      !confirm(
        `Stop sharing "${quiz.title}"? The shared copy is deleted from the share server, so the code stops working and people who imported it stop getting updates. Their copies stay in their libraries.`,
      )
    ) {
      return;
    }
    void act("stop", () => quizApi.unshareQuiz(quiz.id));
  };

  const copyCode = async () => {
    if (!share) return;
    try {
      await navigator.clipboard.writeText(share.code);
      setCopied(true);
    } catch {
      setError("Could not copy the code. Select it and copy it instead.");
    }
  };

  const footer = share ? (
    <>
      <Button variant="ghost" onClick={stopSharing} disabled={busy !== null} className="mr-auto">
        {busy === "stop" ? busyLabels.stop : "Stop sharing"}
      </Button>
      {unpublished ? (
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy !== null}>
            Close
          </Button>
          <Button
            onClick={() => void act("publish", () => quizApi.publishQuizUpdate(quiz.id))}
            disabled={busy !== null}
          >
            {busy === "publish" ? busyLabels.publish : "Publish update"}
          </Button>
        </>
      ) : (
        <Button onClick={onClose} disabled={busy !== null}>
          Done
        </Button>
      )}
    </>
  ) : (
    <>
      <Button variant="secondary" onClick={onClose} disabled={busy !== null}>
        Cancel
      </Button>
      <Button
        onClick={() => void act("share", () => quizApi.shareQuiz(quiz.id))}
        disabled={busy !== null}
      >
        {busy === "share" ? busyLabels.share : lapsed ? "Share again" : "Share"}
      </Button>
    </>
  );

  return (
    <Modal open={open} title={`Share "${quiz.title}"`} onClose={onClose} footer={footer}>
      <div className="flex flex-col gap-4">
        {share ? (
          <>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-800">
              <span
                className="select-all font-mono text-3xl font-semibold tracking-widest text-slate-900 dark:text-neutral-100"
                aria-label={`Share code ${share.code.split("").join(" ")}`}
              >
                {formatShareCode(share.code)}
              </span>
              <Button variant="secondary" size="sm" onClick={() => void copyCode()}>
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className={noteClass}>
              Anyone with this code can import the quiz with "Import quiz", then "From share
              code". They get your updates after you publish them.
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span
                className={
                  shareExpiresSoon(share)
                    ? "text-amber-700 dark:text-amber-400"
                    : "text-slate-600 dark:text-neutral-400"
                }
              >
                Version {share.version}
                {share.expiresAt && ` · Expires ${formatDay(share.expiresAt)}`}
              </span>
              {share.expiresAt && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void act("extend", () => quizApi.extendQuizShare(quiz.id))}
                  disabled={busy !== null}
                >
                  {busy === "extend" ? busyLabels.extend : "Extend to 90 days"}
                </Button>
              )}
            </div>
            {unpublished ? (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                You replaced this quiz after sharing it. People with the code still get the
                shared version until you publish the update. Publishing keeps the same code.
              </p>
            ) : (
              <p className={noteClass}>
                To change the shared quiz, replace it from a file, then publish the update here.
              </p>
            )}
          </>
        ) : (
          <>
            {lapsed && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                The code {formatShareCode(quiz.share!.code)} expired and no longer works.
                Sharing again gives the quiz a new code.
              </p>
            )}
            <p className={noteClass}>
              Upload this quiz and its images to the QuizApp share server to get an 8-digit
              code. Anyone with the code can import the quiz and get updates you publish.
            </p>
            <p className={noteClass}>
              Shared quizzes expire 30 days after you share them or publish an update. You can
              extend a share to 90 days.
            </p>
          </>
        )}
        {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
      </div>
    </Modal>
  );
}
