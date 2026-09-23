import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuizSession } from "@/hooks/useQuizSession";
import { gradeQuiz } from "@shared/grading";
import { formatTimeTaken } from "@/lib/formatDuration";
import { DetailPageLayout } from "@/components/ui/DetailPageLayout";
import { Button } from "@/components/ui/Button";
import { ScoreSummary } from "@/components/review/ScoreSummary";
import { ReviewItem } from "@/components/review/ReviewItem";

export function ReviewPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const quiz = useQuizSession((s) => s.quiz);
  const answers = useQuizSession((s) => s.answers);
  const order = useQuizSession((s) => s.order);
  const startedAt = useQuizSession((s) => s.startedAt);
  const endedAt = useQuizSession((s) => s.endedAt);
  const reset = useQuizSession((s) => s.reset);

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
    () => gradeQuiz(orderedQuestions, answers),
    [orderedQuestions, answers],
  );

  if (!quiz) return null;

  return (
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
          timeTaken={
            startedAt && endedAt ? formatTimeTaken(startedAt, endedAt) : null
          }
        />
      </div>

      <div className="flex flex-col gap-3">
        {orderedQuestions.map((question, idx) => {
          const result = grade.results.find(
            (r) => r.questionId === question.id,
          );
          return (
            <ReviewItem
              key={question.id}
              index={idx}
              question={question}
              userAnswer={result?.userAnswer ?? null}
              correct={!!result?.correct}
            />
          );
        })}
      </div>
    </DetailPageLayout>
  );
}
