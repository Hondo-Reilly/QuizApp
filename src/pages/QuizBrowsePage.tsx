import { useEffect, useState } from "react";
import {
  useLocation,
  useNavigate,
  useOutletContext,
  useParams,
} from "react-router-dom";
import { quizApi } from "@/api/quizApi";
import { Button } from "@/components/ui/Button";
import { QuestionAnswerList } from "@/components/quiz/QuestionAnswerList";
import { PrintQuizDialog } from "@/components/quiz/PrintQuizDialog";
import { AttemptList } from "@/components/library/AttemptList";
import { MoveQuizDialog } from "@/components/library/MoveQuizDialog";
import type { UseLibrary } from "@/hooks/useLibrary";
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

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([quizApi.getQuiz(id), quizApi.listAttempts(id)])
      .then(([q, loadedAttempts]) => {
        if (!active) return;
        if (!q) setError("Quiz not found.");
        else {
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
    return (
      <div className="text-sm text-slate-500 dark:text-neutral-400">
        Loading...
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div>
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error ?? "Quiz not found."}
        </div>
        <Button variant="secondary" onClick={back}>
          Back to library
        </Button>
      </div>
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
    <div className="mx-auto max-w-3xl">
      <header className="mb-8">
        <button
          type="button"
          onClick={back}
          className="mb-3 text-sm text-slate-500 hover:text-slate-800 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          ← Library
        </button>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-neutral-100">
          {quiz.title}
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-neutral-400">
          {quiz.description ??
            `${total} ${total === 1 ? "question" : "questions"}`}
        </p>
      </header>

      <PrintQuizDialog
        open={printOpen}
        quiz={quiz}
        onClose={() => setPrintOpen(false)}
      />

      <section className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
          Previous attempts
        </h2>
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
            const drop = new Set(ids);
            setAttempts((current) =>
              current.filter((attempt) => !drop.has(attempt.id)),
            );
          }}
        />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
            Questions
          </h2>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPrintOpen(true)}>
              Save to PDF
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setMoveOpen(true)}>
              Move
            </Button>
            <Button variant="secondary" size="sm" onClick={() => void handleDelete()}>
              Delete
            </Button>
            <Button size="sm" onClick={() => navigate(`/quiz/${id}/setup`)}>
              Start quiz
            </Button>
          </div>
        </div>
        <QuestionAnswerList questions={quiz.questions} />
      </section>

      <MoveQuizDialog
        open={moveOpen}
        quiz={moveTarget}
        folders={library.folders}
        onClose={() => setMoveOpen(false)}
        onMove={(nextFolderId) => library.moveQuiz(quiz.id, nextFolderId)}
      />
    </div>
  );
}
