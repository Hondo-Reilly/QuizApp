import { useCallback, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { quizApi } from "@/api/quizApi";
import { useQuizSession } from "@/hooks/useQuizSession";
import { useQuizKeyboard } from "@/hooks/useQuizKeyboard";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { AnswerFeedback } from "@/components/quiz/AnswerFeedback";
import { ProgressBar } from "@/components/quiz/ProgressBar";
import { AfterEachNav } from "@/components/quiz/AfterEachNav";
import { AtEndNav } from "@/components/quiz/AtEndNav";
import { QuestionSidebar } from "@/components/quiz/QuestionSidebar";
import { PageHeader } from "@/components/ui/PageHeader";
import { gradeQuestion, gradeQuiz } from "@shared/grading";
import { countAnswered, hasAnswer } from "@shared/answers";
import type { UserAnswer } from "@shared/types";

export function TakeQuizPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const session = useQuizSession();
  const savedAttempt = useRef(false);

  useEffect(() => {
    if (!session.quiz || session.quiz.id !== id) {
      navigate(`/quiz/${id}/setup`, { replace: true });
    }
  }, [id, navigate, session.quiz]);

  const question = session.currentQuestion();

  const value: UserAnswer = question
    ? (session.answers[question.id] ?? null)
    : null;
  const submitted = session.isCurrentSubmitted();
  const isLast = session.isLast();
  const isFirst = session.currentIndex === 0;
  const revealAfterEach = session.config.revealMode === "after_each";
  const lockedForReveal = revealAfterEach && submitted;
  const answeredCount = countAnswered(session.order, session.answers);
  const allAnswered = answeredCount === session.order.length;

  const handlePrevious = useCallback(
    () => session.goTo(session.currentIndex - 1),
    [session],
  );
  const handleNext = useCallback(() => session.next(), [session]);
  const handleSubmitReveal = useCallback(
    () => session.submitCurrent(),
    [session],
  );
  const handleFinish = useCallback(() => {
    const quiz = session.quiz;
    const persist = async () => {
      if (!quiz || savedAttempt.current) return;
      savedAttempt.current = true;
      const ordered = session.order
        .map((questionId) => quiz.questions.find((q) => q.id === questionId))
        .filter((q): q is NonNullable<typeof q> => !!q);
      const grade = gradeQuiz(ordered, session.answers);
      try {
        await quizApi.saveAttempt({
          quizId: quiz.id,
          correct: grade.correct,
          total: grade.total,
          percent: grade.percent,
          questionIds: ordered.map((q) => q.id),
          answers: session.answers,
        });
      } catch {
        savedAttempt.current = false;
      }
    };
    void persist().finally(() => navigate(`/quiz/${id}/review`));
  }, [navigate, id, session]);

  const handleSetAnswer = useCallback(
    (v: UserAnswer) => {
      if (question) session.setAnswer(question.id, v);
    },
    [question, session],
  );

  const handlePrimary = useCallback(() => {
    if (revealAfterEach) {
      if (!submitted) {
        if (hasAnswer(value)) handleSubmitReveal();
      } else if (isLast) {
        handleFinish();
      } else {
        handleNext();
      }
    } else if (allAnswered || isLast) {
      handleFinish();
    } else {
      handleNext();
    }
  }, [
    revealAfterEach,
    submitted,
    value,
    isLast,
    allAnswered,
    handleSubmitReveal,
    handleFinish,
    handleNext,
  ]);

  useQuizKeyboard({
    question,
    value,
    choiceOrder: question ? session.choicesOrder[question.id] : undefined,
    onSetAnswer: handleSetAnswer,
    onPrimary: handlePrimary,
    onPrevious: handlePrevious,
    onNext: handleNext,
    answerDisabled: lockedForReveal,
  });

  if (!session.quiz || !question) return null;

  return (
    <div className="mx-auto flex max-w-5xl gap-6">
      <aside className="w-56 shrink-0">
        <QuestionSidebar
          questions={session.quiz.questions}
          order={session.order}
          currentIndex={session.currentIndex}
          answers={session.answers}
          onSelect={session.goTo}
        />
      </aside>

      <div className="min-w-0 flex-1">
        <PageHeader title={session.quiz.title} />

        <div className="mb-4">
          <ProgressBar
            current={session.currentIndex + 1}
            total={session.order.length}
            answered={answeredCount}
          />
        </div>

        <div className="flex flex-col gap-4">
          <QuestionCard
            question={question}
            value={value}
            onChange={handleSetAnswer}
            reveal={lockedForReveal}
            disabled={lockedForReveal}
            choiceOrder={session.choicesOrder[question.id]}
          />

          {lockedForReveal && (
            <AnswerFeedback
              correct={gradeQuestion(question, value)}
              explanation={question.explanation}
            />
          )}

          {revealAfterEach ? (
            <AfterEachNav
              isFirst={isFirst}
              isLast={isLast}
              submitted={submitted}
              canSubmit={hasAnswer(value)}
              onPrevious={handlePrevious}
              onNext={handleNext}
              onSubmit={handleSubmitReveal}
              onFinish={handleFinish}
            />
          ) : (
            <AtEndNav
              isFirst={isFirst}
              isLast={isLast}
              showSubmit={allAnswered || isLast}
              onPrevious={handlePrevious}
              onNext={handleNext}
              onSubmit={handleFinish}
            />
          )}
        </div>
      </div>
    </div>
  );
}
