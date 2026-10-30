import { useCallback, useRef, useState } from "react";
import { QuizContentProvider } from "@/components/content/QuizContentContext";
import {
  useLocation,
  useNavigate,
  useOutletContext,
  useParams,
} from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { ContextMenu } from "@/components/ui/ContextMenu";
import { DetailPageLayout } from "@/components/ui/DetailPageLayout";
import { LoadingMessage, PageErrorState } from "@/components/ui/PageState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { QuestionAnswerList } from "@/components/quiz/QuestionAnswerList";
import { PrintQuizDialog } from "@/components/quiz/PrintQuizDialog";
import { AttemptList } from "@/components/library/AttemptList";
import { MoveQuizDialog } from "@/components/library/MoveQuizDialog";
import { useSharingControls } from "@/hooks/useSharingControls";
import type { UseLibrary } from "@/hooks/useLibrary";
import { useQuizBrowseData } from "@/hooks/useQuizBrowseData";
import { useShareActions } from "@/hooks/useShareActions";
import { deleteQuizPrompt } from "@/lib/shareText";
import type { QuizMetadata } from "@shared/types";

export function QuizBrowsePage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const library = useOutletContext<UseLibrary>();
  const storedFolderId =
    (location.state as { folderId?: string | null } | null)?.folderId ?? null;
  const metadata = library.quizzes.find((item) => item.id === id) ?? null;
  const folderId = metadata?.folderId ?? storedFolderId;

  const { quiz, attempts, loading, error, setError, removeAttempts } =
    useQuizBrowseData(id, metadata?.updatedAt);
  const shareActions = useShareActions(library);
  const sharing = useSharingControls(metadata, shareActions, () =>
    library.checkSharedQuizzes(true),
  );
  const [printOpen, setPrintOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moreAt, setMoreAt] = useState<{ x: number; y: number } | null>(null);
  // The menu closes on any outside press, including one on its own button;
  // remember when, so that press does not open it again.
  const moreClosedAt = useRef(0);
  const closeMore = useCallback(() => {
    moreClosedAt.current = Date.now();
    setMoreAt(null);
  }, []);

  const back = () => navigate(folderId ? `/folder/${folderId}` : "/");

  if (loading) {
    return <LoadingMessage />;
  }

  if (error || !quiz) {
    return (
      <PageErrorState
        message={error ?? "Quiz not found."}
        backLabel="Back to library"
        onBack={back}
      />
    );
  }

  const total = quiz.questions.length;
  const moveTarget: QuizMetadata = metadata ?? {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    author: quiz.author,
    tags: quiz.tags,
    questionCount: total,
    importedAt: new Date(0).toISOString(),
    folderId,
  };

  const handleDelete = async () => {
    if (!confirm(deleteQuizPrompt(moveTarget))) return;
    try {
      if (await library.deleteQuiz(quiz.id)) back();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <QuizContentProvider quiz={quiz}>
      <DetailPageLayout
        width="3xl"
        onBack={back}
        title={quiz.title}
        subtitle={
          quiz.description ??
          `${total} ${total === 1 ? "question" : "questions"}`
        }
        headerSpacing="roomy"
      >
        <PrintQuizDialog
          open={printOpen}
          quiz={quiz}
          onClose={() => setPrintOpen(false)}
        />

        {sharing.status}
        {shareActions.dialog}

        <section className="mb-8">
          <SectionHeader title="Previous attempts" />
          <AttemptList
            quiz={quiz}
            attempts={attempts}
            onOpen={(attempt) =>
              navigate(`/quiz/${id}/attempt/${attempt.id}`, {
                state: { folderId },
              })
            }
            onDelete={removeAttempts}
          />
        </section>

        <section>
          <SectionHeader
            title="Questions"
            actions={
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  aria-label="More actions"
                  title="More actions"
                  aria-haspopup="menu"
                  aria-expanded={moreAt !== null}
                  className="!px-0 w-[34px]"
                  onClick={(event) => {
                    if (Date.now() - moreClosedAt.current < 300) return;
                    const rect = event.currentTarget.getBoundingClientRect();
                    setMoreAt({ x: rect.right, y: rect.bottom + 4 });
                  }}
                >
                  {/* h-5 matches the text line height, so the button is as tall as its neighbours. */}
                  <svg viewBox="0 0 16 20" aria-hidden="true" className="h-5 w-4" fill="currentColor">
                    <circle cx="3" cy="10" r="1.5" />
                    <circle cx="8" cy="10" r="1.5" />
                    <circle cx="13" cy="10" r="1.5" />
                  </svg>
                </Button>
                <ContextMenu
                  position={moreAt}
                  align="end"
                  label="More actions"
                  items={[
                    { label: "Save to PDF", onSelect: () => setPrintOpen(true) },
                    { label: "Move", onSelect: () => setMoveOpen(true) },
                    {
                      label: "Replace from file…",
                      onSelect: () => void shareActions.replaceFromFile(moveTarget),
                    },
                    { label: "Delete", onSelect: () => void handleDelete() },
                  ]}
                  onClose={closeMore}
                />
                {sharing.buttons}
                <Button size="sm" onClick={() => navigate(`/quiz/${id}/setup`)}>
                  Start quiz
                </Button>
              </>
            }
          />
          <QuestionAnswerList questions={quiz.questions} scenarios={quiz.scenarios} />
        </section>

        <MoveQuizDialog
          open={moveOpen}
          quiz={moveTarget}
          folders={library.folders}
          onClose={() => setMoveOpen(false)}
          onMove={(nextFolderId) => library.moveQuiz(quiz.id, nextFolderId)}
        />
      </DetailPageLayout>
    </QuizContentProvider>
  );
}
