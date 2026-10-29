import { formatShareCode, shareLapsed } from "@shared/cloudShare";
import type { QuizMetadata, QuizShare } from "@shared/types";

const SOON_MS = 7 * 24 * 60 * 60 * 1000;

/** An error's message without the "Error invoking remote method" prefix Electron adds. */
export function errorText(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  return message.replace(/^Error invoking remote method '[^']+': (?:\w*Error: )?/, "");
}

export function formatDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** A share the server still has. */
export function liveShare(meta: QuizMetadata, now = new Date()): QuizShare | null {
  return meta.share && !shareLapsed(meta.share, now) ? meta.share : null;
}

export function shareExpiresSoon(share: QuizShare, now = new Date()): boolean {
  return share.expiresAt !== null && Date.parse(share.expiresAt) - now.getTime() < SOON_MS;
}

export function deleteQuizPrompt(meta: QuizMetadata): string {
  const share = liveShare(meta);
  if (!share) return `Delete "${meta.title}"?`;
  return (
    `Delete "${meta.title}"?\n\n` +
    `This quiz is shared with code ${formatShareCode(share.code)}. Deleting it also deletes ` +
    `the shared copy from the share server, so the code stops working and people who ` +
    `imported it stop getting updates. This cannot be undone.`
  );
}

export function deleteFolderSharedNote(quizzes: readonly QuizMetadata[]): string {
  const shared = quizzes.filter((quiz) => liveShare(quiz)).length;
  if (shared === 0) return "";
  return shared === 1
    ? "\n\nOne of these quizzes is shared. Its shared copy will also be deleted from the share server, and its code will stop working."
    : `\n\n${shared} of these quizzes are shared. Their shared copies will also be deleted from the share server, and their codes will stop working.`;
}

export function keepLocalPrompt(err: unknown, what: string): string {
  return (
    `Could not delete the shared copy: ${errorText(err)}\n\n` +
    `Delete ${what} from this library anyway? The shared copy will stay on the share server until it expires.`
  );
}
