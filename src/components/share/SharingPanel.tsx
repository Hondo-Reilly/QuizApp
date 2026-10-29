import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { ShareActions } from "@/hooks/useShareActions";
import { errorText, formatDay, liveShare, shareExpiresSoon } from "@/lib/shareText";
import { formatShareCode, hasUnpublishedChanges } from "@shared/cloudShare";
import type { QuizMetadata } from "@shared/types";

export interface SharingPanelProps {
  quiz: QuizMetadata;
  actions: ShareActions;
  /** Checks share codes now, ignoring the background interval. */
  onCheck: () => Promise<void>;
}

const lineClass = "text-sm text-slate-600 dark:text-neutral-400";
const warnClass = "text-sm text-amber-700 dark:text-amber-400";

/** Share state and actions for one quiz on its detail page. */
export function SharingPanel({ quiz, actions, onCheck }: SharingPanelProps) {
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [checkNote, setCheckNote] = useState<string | null>(null);
  const share = liveShare(quiz);
  const source = quiz.cloudSource;

  const check = async () => {
    setChecking(true);
    setCheckNote(null);
    try {
      await onCheck();
      setCheckNote("Checked just now.");
    } catch (err) {
      setCheckNote(errorText(err));
    } finally {
      setChecking(false);
    }
  };

  const update = async () => {
    setUpdating(true);
    try {
      await actions.updateFromCode(quiz);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Card className="flex flex-col gap-3">
      {share ? (
        <p className={lineClass}>
          Shared with code{" "}
          <span className="font-mono font-semibold text-slate-900 dark:text-neutral-100">
            {formatShareCode(share.code)}
          </span>
          , version {share.version}.
          {share.expiresAt && (
            <span className={shareExpiresSoon(share) ? warnClass : undefined}>
              {" "}
              Expires {formatDay(share.expiresAt)}.
            </span>
          )}
          {hasUnpublishedChanges(quiz) && (
            <span className={warnClass}> You have changes that are not published yet.</span>
          )}
        </p>
      ) : quiz.share ? (
        <p className={warnClass}>
          The share code {formatShareCode(quiz.share.code)} expired. Share the quiz again to get a
          new code.
        </p>
      ) : (
        <p className={lineClass}>Not shared. Share it to get a code others can import it with.</p>
      )}

      {source && (
        <p className={lineClass}>
          Imported from code{" "}
          <span className="font-mono font-semibold text-slate-900 dark:text-neutral-100">
            {formatShareCode(source.code)}
          </span>
          , version {source.version}.{" "}
          {source.gone ? (
            <span>That code no longer works, so this quiz will not get updates.</span>
          ) : source.available ? (
            <span className="font-medium text-brand-700 dark:text-brand-300">
              Version {source.available.version} is available.
            </span>
          ) : (
            <span>Last checked {formatDay(source.checkedAt)}.</span>
          )}
          {checkNote && <span> {checkNote}</span>}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {source &&
          !source.gone &&
          // Once a check finds a newer version, the same spot offers the update.
          (source.available ? (
            <Button size="sm" onClick={() => void update()} disabled={updating}>
              {updating ? "Updating…" : "Update quiz"}
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => void check()} disabled={checking}>
              {checking ? "Checking…" : "Check for updates"}
            </Button>
          ))}
        <Button variant="secondary" size="sm" onClick={() => void actions.replaceFromFile(quiz)}>
          Replace from file…
        </Button>
        <Button size="sm" onClick={() => actions.openShare(quiz)}>
          {share ? "Share settings" : "Share…"}
        </Button>
      </div>
    </Card>
  );
}
