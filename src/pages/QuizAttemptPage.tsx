import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { quizApi } from "@/api/quizApi";
import { Button } from "@/components/ui/Button";
import { DetailPageLayout } from "@/components/ui/DetailPageLayout";
import { LoadingMessage, PageErrorState } from "@/components/ui/PageState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { QuestionAnswerList } from "@/components/quiz/QuestionAnswerList";
import {
  attemptExportFilename,
  buildAttemptExport,
  downloadJson,
} from "@/lib/exportAttempt";
import { formatTimeTaken } from "@/lib/formatDuration";
import {
  rememberAttempt,
  rememberQuiz,
  rememberedAttempt,
  rememberedQuiz,
} from "@/lib/quizPageCache";
import type { Question, Quiz, QuizAttempt } from "@shared/types";

function attemptSubtitle(attempt: QuizAttempt): string {
  const taken = attempt.startedAt
    ? formatTimeTaken(attempt.startedAt, attempt.completedAt)
    : null;
  const parts = [
    formatDate(attempt.completedAt),
    `${attempt.correct}/${attempt.total} correct`,
    `${attempt.percent}%`,
  ];
  if (taken) parts.push(taken);
  return parts.join(" · ");
}

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

  const [quiz, setQuiz] = useState<Quiz | null>(() => rememberedQuiz(id));
  const [attempt, setAttempt] = useState<QuizAttempt | null>(() =>
    rememberedAttempt(attemptId, id),
  );
  const [loading, setLoading] = useState(
    () => rememberedQuiz(id) == null || rememberedAttempt(attemptId, id) == null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const knownQuiz = rememberedQuiz(id);
    const knownAttempt = rememberedAttempt(attemptId, id);
    if (knownQuiz && knownAttempt) {
      setQuiz(knownQuiz);
      setAttempt(knownAttempt);
      setError(null);
      setLoading(false);
    } else {
      setLoading(true);
      setError(null);
    }
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
        rememberQuiz(loadedQuiz);
        rememberAttempt(loadedAttempt);
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
    return <LoadingMessage />;
  }

  if (error || !quiz || !attempt) {
    return (
      <PageErrorState
        message={error ?? "Attempt not found."}
        backLabel="Back to quiz"
        onBack={back}
      />
    );
  }

  return (
    <DetailPageLayout
      width="3xl"
      onBack={back}
      title={quiz.title}
      subtitle={attemptSubtitle(attempt)}
    >
      <SectionHeader
        title="Questions"
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              downloadJson(
                buildAttemptExport(quiz, attempt, questions),
                attemptExportFilename(quiz.title, attempt.completedAt),
              )
            }
          >
            Export attempt
          </Button>
        }
      />
      <QuestionAnswerList questions={questions} answers={attempt.answers} />
    </DetailPageLayout>
  );
}
