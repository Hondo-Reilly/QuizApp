import { useCallback, useEffect, useMemo, useState } from "react";
import { QuizContentProvider } from "@/components/content/QuizContentContext";
import { useNavigate, useParams } from "react-router-dom";
import { useSessionStore } from "@/state/sessionStore";
import { gradeQuiz } from "@shared/grading";
import { scenarioFor, startsScenario } from "@shared/scenarios";
import { formatTimeTaken } from "@/lib/formatDuration";
import { DetailPageLayout } from "@/components/ui/DetailPageLayout";
import { Button } from "@/components/ui/Button";
import { ScoreSummary } from "@/components/review/ScoreSummary";
import { ReviewItem } from "@/components/review/ReviewItem";
import { ScenarioPanel } from "@/components/quiz/ScenarioPanel";
import { ErrorNotice } from "@/components/ui/PageState";
import { useAttemptFlags } from "@/hooks/useAttemptFlags";
import { quizApi } from "@/api/quizApi";
import { downloadAttemptExport } from "@/lib/exportAttempt";
import { useAttemptSelfMarks, type SelfMarkState } from "@/hooks/useAttemptSelfMarks";
import { PhotoSourceProvider, sessionPhotoSource } from "@/components/content/PhotoSource";

export function ReviewPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const quiz = useSessionStore((s) => s.quiz);
  const answers = useSessionStore((s) => s.answers);
  const order = useSessionStore((s) => s.order);
  const startedAt = useSessionStore((s) => s.startedAt);
  const endedAt = useSessionStore((s) => s.endedAt);
  const reset = useSessionStore((s) => s.reset);
  const flaggedMap = useSessionStore((s) => s.flagged);
  const setFlags = useSessionStore((s) => s.setFlags);
  const savedAttemptId = useSessionStore((s) => s.savedAttemptId);
  const selfMarks = useSessionStore((s) => s.selfMarks);
  const selfMarking = useSessionStore((s) => s.config.selfMark);
  const setSelfMarks = useSessionStore((s) => s.setSelfMarks);

  useEffect(() => {
    if (!quiz || quiz.id !== id) {
      navigate(`/quiz/${id}/setup`, { replace: true });
    }
  }, [id, navigate, quiz]);

  const orderedQuestions = useMemo(() => {
    if (!quiz) return [];
    return order
      .map((qid) => quiz.questions.find((q) => q.id === qid))
      .filter((q): q is NonNullable<typeof q> => !!q);
  }, [quiz, order]);

  const grade = useMemo(
    () => gradeQuiz(orderedQuestions, answers, selfMarking ? selfMarks : {}),
    [orderedQuestions, answers, selfMarks, selfMarking],
  );

  const flaggedList = useMemo(
    () => order.filter((questionId) => flaggedMap[questionId]),
    [order, flaggedMap],
  );
  const flags = useAttemptFlags(savedAttemptId, flaggedList, setFlags);
  const applyMarks = useCallback(
    (next: SelfMarkState) => {
      setSelfMarks(next.selfMarks);
      setFlags(next.flagged);
    },
    [setSelfMarks, setFlags],
  );
  const marks = useAttemptSelfMarks({
    attemptId: savedAttemptId,
    questions: orderedQuestions,
    answers,
    selfMarks,
    flagged: flaggedList,
    apply: applyMarks,
  });
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const saveError = flags.error ?? marks.error ?? exportError;

  // Export the saved record, read fresh so flag and mark changes made here are included.
  const exportAttempt = async () => {
    if (!quiz || !savedAttemptId) return;
    setExporting(true);
    setExportError(null);
    try {
      const attempt = await quizApi.getAttempt(savedAttemptId);
      if (!attempt) throw new Error("The saved attempt was not found.");
      await downloadAttemptExport(quiz, [attempt], true);
    } catch (err) {
      setExportError(
        `Could not export this attempt. ${err instanceof Error ? err.message : ""}`.trim(),
      );
    } finally {
      setExporting(false);
    }
  };

  if (!quiz) return null;

  return (
    <QuizContentProvider quiz={quiz}>
      <PhotoSourceProvider source={sessionPhotoSource}>
      <DetailPageLayout
        width="2xl"
        onBack={() => {
          reset();
          navigate(`/quiz/${id}`);
        }}
        title="Review"
        subtitle={quiz.title}
        actions={
          <>
            <Button
              variant="secondary"
              disabled={!savedAttemptId || exporting}
              onClick={() => void exportAttempt()}
            >
              {exporting ? "Exporting…" : "Export attempt"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                reset();
                navigate(`/quiz/${id}/setup`);
              }}
            >
              Retake
            </Button>
            <Button
              onClick={() => {
                reset();
                navigate("/");
              }}
            >
              Back to library
            </Button>
          </>
        }
      >
        <div className="mb-6">
          <ScoreSummary
            correct={grade.correct}
            total={grade.total}
            percent={grade.percent}
            ungraded={grade.ungraded}
            timeTaken={
              startedAt && endedAt ? formatTimeTaken(startedAt, endedAt) : null
            }
          />
        </div>

        {saveError && (
          <div className="mb-3">
            <ErrorNotice message={saveError} />
          </div>
        )}

        <div className="flex flex-col gap-3">
          {orderedQuestions.map((question, idx) => {
            const result = grade.results.find(
              (r) => r.questionId === question.id,
            );
            const scenario = startsScenario(orderedQuestions, idx)
              ? scenarioFor(quiz, question)
              : undefined;
            return (
              <div key={question.id} className="flex flex-col gap-3">
                {scenario && <ScenarioPanel scenario={scenario} />}
                <ReviewItem
                  index={idx}
                  question={question}
                  userAnswer={result?.userAnswer ?? null}
                  outcome={result?.outcome ?? "wrong"}
                  flagged={!!flaggedMap[question.id]}
                  onToggleFlag={() => flags.toggle(question.id)}
                  selfMark={selfMarking ? selfMarks[question.id] : undefined}
                  onSelfMark={
                    selfMarking ? (mark) => marks.mark(question.id, mark) : undefined
                  }
                />
              </div>
            );
          })}
        </div>
      </DetailPageLayout>
      </PhotoSourceProvider>
    </QuizContentProvider>
  );
}
