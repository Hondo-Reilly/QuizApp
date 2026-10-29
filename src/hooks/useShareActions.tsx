import { useState, type ReactNode } from "react";
import { ShareQuizDialog } from "@/components/share/ShareQuizDialog";
import type { UseLibrary } from "@/hooks/useLibrary";
import { errorText, liveShare } from "@/lib/shareText";
import type { QuizMetadata } from "@shared/types";

export interface ShareActions {
  openShare: (quiz: QuizMetadata) => void;
  replaceFromFile: (quiz: QuizMetadata) => Promise<void>;
  updateFromCode: (quiz: QuizMetadata) => Promise<void>;
  /** The share dialog; render it once on the page. */
  dialog: ReactNode;
}

/** Share, replace and update actions shared by the library and the quiz page. */
export function useShareActions(library: UseLibrary): ShareActions {
  const [shareId, setShareId] = useState<string | null>(null);
  const shareQuiz = library.quizzes.find((quiz) => quiz.id === shareId) ?? null;

  const replaceFromFile = async (quiz: QuizMetadata) => {
    if (
      !confirm(
        `Replace "${quiz.title}" with a quiz file? Its questions and images are replaced. Its attempts, folder and share code stay.`,
      )
    ) {
      return;
    }
    try {
      const meta = await library.replaceQuizFromFile(quiz.id);
      // A shared quiz now differs from its shared copy; offer to publish it.
      if (meta && liveShare(meta)) setShareId(meta.id);
    } catch (err) {
      alert(`Could not replace the quiz. ${errorText(err)}`);
    }
  };

  const updateFromCode = async (quiz: QuizMetadata) => {
    const version = quiz.cloudSource?.available?.version;
    if (
      !confirm(
        `Update "${quiz.title}"${version ? ` to version ${version}` : ""}? Your copy is replaced with the newest shared version. Your attempts stay.`,
      )
    ) {
      return;
    }
    try {
      await library.updateSharedQuiz(quiz.id);
    } catch (err) {
      alert(`Could not update the quiz. ${errorText(err)}`);
      await library.reload().catch(() => undefined);
    }
  };

  return {
    openShare: (quiz) => setShareId(quiz.id),
    replaceFromFile,
    updateFromCode,
    dialog: (
      <ShareQuizDialog
        open={shareQuiz !== null}
        quiz={shareQuiz}
        onClose={() => setShareId(null)}
        onChanged={library.reload}
      />
    ),
  };
}
