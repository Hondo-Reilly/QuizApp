import { formatDay, liveShare, shareExpiresSoon } from "@/lib/shareText";
import { formatShareCode } from "@shared/cloudShare";
import type { QuizMetadata } from "@shared/types";

const tone = {
  info: "text-brand-700 dark:text-brand-300",
  warn: "text-amber-700 dark:text-amber-400",
  muted: "text-slate-500 dark:text-neutral-400",
};

/** Short share and update labels for a quiz, as spans for a metadata row. */
export function shareLabels(quiz: QuizMetadata): { text: string; tone: keyof typeof tone }[] {
  const labels: { text: string; tone: keyof typeof tone }[] = [];
  const share = liveShare(quiz);
  if (share) {
    labels.push({ text: `Shared · ${formatShareCode(share.code)}`, tone: "info" });
    if (shareExpiresSoon(share) && share.expiresAt) {
      labels.push({ text: `Share expires ${formatDay(share.expiresAt)}`, tone: "warn" });
    }
  } else if (quiz.share) {
    labels.push({ text: "Share expired", tone: "warn" });
  }
  const source = quiz.cloudSource;
  if (source?.gone) labels.push({ text: "No longer shared", tone: "muted" });
  else if (source?.available) {
    labels.push({ text: `Update available (version ${source.available.version})`, tone: "info" });
  }
  return labels;
}

export function ShareStatus({ quiz }: { quiz: QuizMetadata }) {
  return (
    <>
      {shareLabels(quiz).map((label) => (
        <span key={label.text} className={`font-medium ${tone[label.tone]}`}>
          {label.text}
        </span>
      ))}
    </>
  );
}
