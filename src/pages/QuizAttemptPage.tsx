import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { quizApi } from "@/api/quizApi";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { QuestionAnswerList } from "@/components/quiz/QuestionAnswerList";
import {
  attemptExportFilename,
  buildAttemptExport,
  downloadJson,
} from "@/lib/exportAttempt";
import type { Question, Quiz, QuizAttempt } from "@shared/types";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function QuizAttemptPage() {
  const { id = "", attemptId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const folderId =
    (location.state as { folderId?: string | null } | null)?.folderId ?? null;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([quizApi.getQuiz(id), quizApi.getAttempt(attemptId)])
      .then(([loadedQuiz, loadedAttempt]) => {
        if (!active) return;
        if (!loadedQuiz) {
          setError("Quiz not found.");
          return;
        }
        if (!loadedAttempt || loadedAttempt.quizId !== id) {
          setError("Attempt not found.");
          return;
        }
        setQuiz(loadedQuiz);
        setAttempt(loadedAttempt);
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
  }, [id, attemptId]);

  const questions = useMemo(() => {
    if (!quiz || !attempt) return [] as Question[];
    const byId = new Map(quiz.questions.map((question) => [question.id, question]));
    return attempt.questionIds
      .map((questionId) => byId.get(questionId))
      .filter((question): question is Question => !!question);
  }, [quiz, attempt]);

  const back = () =>
    navigate(`/quiz/${id}`, { state: { folderId } });

  if (loading) {
    return (
      <div className="text-sm text-slate-500 dark:text-neutral-400">
        Loading...
      </div>
    );
  }

  if (error || !quiz || !attempt) {
    return (
      <div>
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error ?? "Attempt not found."}
        </div>
        <Button variant="secondary" onClick={back}>
          Back to quiz
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={quiz.title}
        subtitle={`${formatDate(attempt.completedAt)} · ${attempt.correct}/${attempt.total} correct · ${attempt.percent}%`}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() =>
                downloadJson(
                  buildAttemptExport(quiz, attempt, questions),
                  attemptExportFilename(quiz.title, attempt.completedAt),
                )
              }
            >
              Export attempt
            </Button>
            <Button variant="secondary" onClick={back}>
              Back to quiz
            </Button>
          </>
        }
      />
      <QuestionAnswerList questions={questions} answers={attempt.answers} />
    </div>
  );
}
