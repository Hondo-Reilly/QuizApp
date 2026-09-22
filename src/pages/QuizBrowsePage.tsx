import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { quizApi } from "@/api/quizApi";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { QuestionAnswerList } from "@/components/quiz/QuestionAnswerList";
import { AttemptList } from "@/components/library/AttemptList";
import type { Quiz, QuizAttempt } from "@shared/types";

export function QuizBrowsePage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const folderId =
    (location.state as { folderId?: string | null } | null)?.folderId ?? null;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={quiz.title}
        subtitle={
          quiz.description ??
          `${total} ${total === 1 ? "question" : "questions"}`
        }
        actions={
          <>
            <Button variant="secondary" onClick={back}>
              Back to library
            </Button>
            <Button onClick={() => navigate(`/quiz/${id}/setup`)}>
              Start quiz
            </Button>
          </>
        }
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
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
          Questions
        </h2>
        <QuestionAnswerList questions={quiz.questions} />
      </section>
    </div>
  );
}
