import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import type { ShareActions } from "@/hooks/useShareActions";
import { errorText, formatDay, liveShare, shareExpiresSoon } from "@/lib/shareText";
import { formatShareCode, hasUnpublishedChanges } from "@shared/cloudShare";
import type { QuizMetadata } from "@shared/types";

const lineClass = "text-sm text-slate-600 dark:text-neutral-400";
const warnClass = "text-amber-700 dark:text-amber-400";
const codeClass = "font-mono font-semibold text-slate-900 dark:text-neutral-100";

export interface SharingControls {
  /** Share and source lines for under the page header, or null when there is nothing to say. */
  status: ReactNode;
  /** Buttons for the quiz page's action row. */
  buttons: ReactNode;
}

/** Share state and actions for one quiz on its detail page. */
export function useSharingControls(
  quiz: QuizMetadata | null,
  actions: ShareActions,
  /** Checks share codes now, ignoring the background interval. */
  onCheck: () => Promise<void>,
): SharingControls {
  const [checking, setChecking] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [checkNote, setCheckNote] = useState<string | null>(null);
  if (!quiz) return { status: null, buttons: null };

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

  const shareLine = share ? (
    <p className={lineClass}>
      Shared with code <span className={codeClass}>{formatShareCode(share.code)}</span>, version{" "}
      {share.version}.
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
    <p className={`text-sm ${warnClass}`}>
      The share code {formatShareCode(quiz.share.code)} expired. Share the quiz again to get a new
      code.
    </p>
  ) : null;

  const sourceLine = source && (
    <p className={lineClass}>
      Imported from code <span className={codeClass}>{formatShareCode(source.code)}</span>, version{" "}
      {source.version}.{" "}
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
  );

  const status =
    shareLine || sourceLine ? (
      <div className="mb-8 flex flex-col gap-1">
        {shareLine}
        {sourceLine}
      </div>
    ) : null;

  const buttons = (
    <>
      {/* Short labels keep the page's action row on one line; titles give the full name. */}
      <Button
        variant="secondary"
        size="sm"
        title="Replace from file"
        onClick={() => void actions.replaceFromFile(quiz)}
      >
        Replace…
      </Button>
      <Button variant="secondary" size="sm" onClick={() => actions.openShare(quiz)}>
        {share ? "Share settings" : "Share…"}
      </Button>
      {source &&
        !source.gone &&
        // Once a check finds a newer version, the same spot offers the update.
        (source.available ? (
          <Button size="sm" onClick={() => void update()} disabled={updating}>
            {updating ? "Updating…" : "Update quiz"}
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            title="Check for updates"
            onClick={() => void check()}
            disabled={checking}
          >
            {checking ? "Checking…" : "Check updates"}
          </Button>
        ))}
    </>
  );

  return { status, buttons };
}
