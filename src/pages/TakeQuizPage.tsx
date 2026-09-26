import { useCallback, useEffect, useRef } from "react";
import { QuizContentProvider } from "@/components/content/QuizContentContext";
import { useNavigate, useParams } from "react-router-dom";
import { useMobileSync } from "@/hooks/useMobileSync";
import { useQuizFinish } from "@/hooks/useQuizFinish";
import { useSessionStore } from "@/state/sessionStore";
import { useQuizKeyboard } from "@/hooks/useQuizKeyboard";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { AnswerFeedback } from "@/components/quiz/AnswerFeedback";
import { QuizProgressHeader } from "@/components/quiz/QuizProgressHeader";
import { AfterEachNav } from "@/components/quiz/AfterEachNav";
import { AtEndNav } from "@/components/quiz/AtEndNav";
import { QuestionSidebar } from "@/components/quiz/QuestionSidebar";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorNotice } from "@/components/ui/PageState";
import { Button } from "@/components/ui/Button";
import { gradeQuestion } from "@shared/grading";
import { countAnswered, hasAnswer } from "@shared/answers";
import { scenarioFor } from "@shared/scenarios";
import type { UserAnswer } from "@shared/types";

export function TakeQuizPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const session = useSessionStore();
  const { saveError, finish } = useQuizFinish(id);
  const finishRef = useRef(finish);
  finishRef.current = finish;

  useMobileSync(() => finishRef.current(true));

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
    finishRef.current(false);
  }, []);

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
    <QuizContentProvider quiz={session.quiz}>
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

          <QuizProgressHeader
            className="mb-4"
            current={session.currentIndex + 1}
            total={session.order.length}
            answered={answeredCount}
            deadlineAt={session.deadlineAt}
            onExpire={handleFinish}
          />

          <div className="flex flex-col gap-4">
            <QuestionCard
              question={question}
              scenario={scenarioFor(session.quiz, question)}
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

            {saveError && (
              <div className="flex flex-col items-start gap-3">
                <ErrorNotice message={saveError} />
                <Button onClick={handleFinish}>Retry save</Button>
              </div>
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
    </QuizContentProvider>
  );
}
