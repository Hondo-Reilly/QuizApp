import { useCallback, useMemo, useState } from "react";
import { QuizContentProvider } from "@/components/content/QuizContentContext";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { DetailPageLayout } from "@/components/ui/DetailPageLayout";
import { ErrorNotice, LoadingMessage, PageErrorState } from "@/components/ui/PageState";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { QuestionAnswerList } from "@/components/quiz/QuestionAnswerList";
import { downloadAttemptExport } from "@/lib/exportAttempt";
import { formatTimeTaken } from "@/lib/formatDuration";
import { useSavedAttempt } from "@/hooks/useSavedAttempt";
import { useAttemptFlags } from "@/hooks/useAttemptFlags";
import { flaggedIds } from "@shared/attemptFlags";
import { useAttemptSelfMarks, type SelfMarkState } from "@/hooks/useAttemptSelfMarks";
import {
  PhotoSourceProvider,
  useAttemptPhotoSource,
  type PhotoSource,
} from "@/components/content/PhotoSource";
import type { Question, QuizAttempt } from "@shared/types";

const NO_PHOTOS: PhotoSource = { resolve: async () => ({}) };

function attemptSubtitle(attempt: QuizAttempt): string {
  const taken = attempt.startedAt
    ? formatTimeTaken(attempt.startedAt, attempt.completedAt)
    : null;
  const parts = [formatDate(attempt.completedAt), `${attempt.correct}/${attempt.total} correct`];
  if (attempt.total > 0) parts.push(`${attempt.percent}%`);
  if (attempt.ungraded) parts.push(`${attempt.ungraded} not graded`);
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

  const { quiz, attempt, loading, error, setAttempt } = useSavedAttempt(id, attemptId);
  const flaggedList = useMemo(() => (attempt ? flaggedIds(attempt) : []), [attempt]);
  const applyFlags = useCallback(
    (next: string[]) => {
      if (attempt) setAttempt({ ...attempt, flagged: next });
    },
    [attempt, setAttempt],
  );
  const flags = useAttemptFlags(attempt?.id ?? null, flaggedList, applyFlags);
  const flaggedSet = useMemo(() => new Set(flaggedList), [flaggedList]);
  const photoSource = useAttemptPhotoSource(attempt?.id ?? null);

  const questions = useMemo(() => {
    if (!quiz || !attempt) return [] as Question[];
    const byId = new Map(quiz.questions.map((question) => [question.id, question]));
    return attempt.questionIds
      .map((questionId) => byId.get(questionId))
      .filter((question): question is Question => !!question);
  }, [quiz, attempt]);

  const applyMarks = useCallback(
    (next: SelfMarkState) => {
      if (!attempt) return;
      setAttempt({
        ...attempt,
        selfMarks: next.selfMarks,
        flagged: next.flagged,
        ...next.score,
      });
    },
    [attempt, setAttempt],
  );
  const marks = useAttemptSelfMarks({
    attemptId: attempt?.id ?? null,
    questions,
    answers: attempt?.answers ?? {},
    selfMarks: attempt?.selfMarks ?? {},
    flagged: flaggedList,
    apply: applyMarks,
  });
  const [exportError, setExportError] = useState<string | null>(null);
  const saveError = flags.error ?? marks.error ?? exportError;

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
    <QuizContentProvider quiz={quiz}>
      <PhotoSourceProvider source={photoSource ?? NO_PHOTOS}>
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
              onClick={() => {
                setExportError(null);
                downloadAttemptExport(quiz, [attempt], true).catch((err: unknown) =>
                  setExportError(
                    `Could not export this attempt. ${err instanceof Error ? err.message : ""}`.trim(),
                  ),
                );
              }}
            >
              Export attempt
            </Button>
          }
        />
        {saveError && (
          <div className="mb-3">
            <ErrorNotice message={saveError} />
          </div>
        )}
        <QuestionAnswerList
          questions={questions}
          scenarios={quiz.scenarios}
          answers={attempt.answers}
          flagged={flaggedSet}
          onToggleFlag={flags.toggle}
          selfMarks={attempt.selfMarks}
          onSelfMark={attempt.selfMarking ? marks.mark : undefined}
        />
      </DetailPageLayout>
      </PhotoSourceProvider>
    </QuizContentProvider>
  );
}
