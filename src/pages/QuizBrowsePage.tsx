import { useEffect, useState } from "react";
import {
  useLocation,
  useNavigate,
  useOutletContext,
  useParams,
} from "react-router-dom";
import { quizApi } from "@/api/quizApi";
import { Button } from "@/components/ui/Button";
import { DetailPageLayout } from "@/components/ui/DetailPageLayout";
import { LoadingMessage, PageErrorState } from "@/components/ui/PageState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { QuestionAnswerList } from "@/components/quiz/QuestionAnswerList";
import { PrintQuizDialog } from "@/components/quiz/PrintQuizDialog";
import { AttemptList } from "@/components/library/AttemptList";
import { MoveQuizDialog } from "@/components/library/MoveQuizDialog";
import type { UseLibrary } from "@/hooks/useLibrary";
import {
  forgetAttempts,
  rememberAttemptList,
  rememberQuiz,
  rememberedAttemptList,
  rememberedQuiz,
} from "@/lib/quizPageCache";
import type { Quiz, QuizAttempt, QuizMetadata } from "@shared/types";

export function QuizBrowsePage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const library = useOutletContext<UseLibrary>();
  const storedFolderId =
    (location.state as { folderId?: string | null } | null)?.folderId ?? null;
  const metadata = library.quizzes.find((item) => item.id === id) ?? null;
  const folderId = metadata?.folderId ?? storedFolderId;

  const [quiz, setQuiz] = useState<Quiz | null>(() => rememberedQuiz(id));
  const [attempts, setAttempts] = useState<QuizAttempt[]>(
    () => rememberedAttemptList(id) ?? [],
  );
  const [loading, setLoading] = useState(
    () => rememberedQuiz(id) == null || rememberedAttemptList(id) == null,
  );
  const [error, setError] = useState<string | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const knownQuiz = rememberedQuiz(id);
    const knownAttempts = rememberedAttemptList(id);
    if (knownQuiz && knownAttempts) {
      setQuiz(knownQuiz);
      setAttempts(knownAttempts);
      setError(null);
      setLoading(false);
    } else {
      setLoading(true);
    }
    Promise.all([quizApi.getQuiz(id), quizApi.listAttempts(id)])
      .then(([q, loadedAttempts]) => {
        if (!active) return;
        if (!q) setError("Quiz not found.");
        else {
          rememberQuiz(q);
          rememberAttemptList(id, loadedAttempts);
          setQuiz(q);
          setAttempts(loadedAttempts);
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

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
          onDelete={async (ids) => {
            await quizApi.deleteAttempts(ids);
            forgetAttempts(ids);
            const drop = new Set(ids);
            setAttempts((current) =>
              current.filter((attempt) => !drop.has(attempt.id)),
            );
          }}
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
        <QuestionAnswerList questions={quiz.questions} />
      </section>

      <MoveQuizDialog
        open={moveOpen}
        quiz={moveTarget}
        folders={library.folders}
        onClose={() => setMoveOpen(false)}
        onMove={(nextFolderId) => library.moveQuiz(quiz.id, nextFolderId)}
      />
    </DetailPageLayout>
  );
}
