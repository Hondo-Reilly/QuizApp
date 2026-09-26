import { useState } from "react";
import { QuizContentProvider } from "@/components/content/QuizContentContext";
import {
  useLocation,
  useNavigate,
  useOutletContext,
  useParams,
} from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { DetailPageLayout } from "@/components/ui/DetailPageLayout";
import { LoadingMessage, PageErrorState } from "@/components/ui/PageState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { QuestionAnswerList } from "@/components/quiz/QuestionAnswerList";
import { PrintQuizDialog } from "@/components/quiz/PrintQuizDialog";
import { AttemptList } from "@/components/library/AttemptList";
import { MoveQuizDialog } from "@/components/library/MoveQuizDialog";
import type { UseLibrary } from "@/hooks/useLibrary";
import { useQuizBrowseData } from "@/hooks/useQuizBrowseData";
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
    useQuizBrowseData(id);
  const [printOpen, setPrintOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);

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
    if (!confirm(`Delete "${quiz.title}"?`)) return;
    try {
      await library.deleteQuiz(quiz.id);
      back();
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
                  onClick={() => setPrintOpen(true)}
                >
                  Save to PDF
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setMoveOpen(true)}
                >
                  Move
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void handleDelete()}
                >
                  Delete
                </Button>
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
