import { useCallback, useEffect, useRef, useState } from "react";
import { QuizContentProvider } from "@/components/content/QuizContentContext";
import { useNavigate, useParams } from "react-router-dom";
import { useMobileSync } from "@/hooks/useMobileSync";
import { useQuizFinish } from "@/hooks/useQuizFinish";
import { useSessionStore } from "@/state/sessionStore";
import { useQuizKeyboard } from "@/hooks/useQuizKeyboard";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { AnswerFeedback } from "@/components/quiz/AnswerFeedback";
import { QuizProgressHeader } from "@/components/quiz/QuizProgressHeader";
import { LiveGrade } from "@/components/quiz/LiveGrade";
import { useLiveGrade } from "@/lib/liveGrade";
import { gradeSoFar } from "@shared/grading";
import { AfterEachNav } from "@/components/quiz/AfterEachNav";
import { AtEndNav } from "@/components/quiz/AtEndNav";
import { QuestionList, QuestionSidebar } from "@/components/quiz/QuestionSidebar";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorNotice } from "@/components/ui/PageState";
import { Button } from "@/components/ui/Button";
import { countAnswered, isAnswered } from "@shared/answers";
import { PhotoSourceProvider, sessionPhotoSource } from "@/components/content/PhotoSource";
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
  const [listOpen, setListOpen] = useState(false);
  const showLiveGrade = useLiveGrade() && revealAfterEach;

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

  const handleToggleFlag = useCallback(() => {
    if (question) session.toggleFlag(question.id);
  }, [question, session]);

  const handlePrimary = useCallback(() => {
    if (revealAfterEach) {
      if (!submitted) {
        // Read the store: Enter in a text box saves its draft just before this runs.
        const latest = question ? useSessionStore.getState().answers[question.id] : null;
        if (isAnswered(question ?? undefined, latest ?? null)) handleSubmitReveal();
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
    question,
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
    onToggleFlag: handleToggleFlag,
    answerDisabled: lockedForReveal,
  });

  if (!session.quiz || !question) return null;

  const questionListProps = {
    questions: session.quiz.questions,
    order: session.order,
    currentIndex: session.currentIndex,
    answers: session.answers,
    flagged: session.flagged,
    submitted: revealAfterEach ? session.submitted : undefined,
    selfMarks: session.selfMarks,
  };

  // Phones open the question list from the pinned bar instead of a sidebar.
  const listButton = (
    <Button
      variant="secondary"
      className="px-3 sm:hidden"
      aria-haspopup="dialog"
      aria-label={`Questions, ${session.currentIndex + 1} of ${session.order.length}`}
      onClick={() => setListOpen(true)}
    >
      <svg
        viewBox="0 0 16 16"
        aria-hidden="true"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <path d="M5.5 4h8M5.5 8h8M5.5 12h8M2.5 4h.01M2.5 8h.01M2.5 12h.01" />
      </svg>
      <span className="tabular-nums">
        {session.currentIndex + 1}/{session.order.length}
      </span>
    </Button>
  );

  return (
    <QuizContentProvider quiz={session.quiz}>
      <PhotoSourceProvider source={sessionPhotoSource}>
      <div className="mx-auto flex max-w-5xl gap-6 pb-20 sm:pb-0">
        <aside className="hidden w-56 shrink-0 sm:block">
          <QuestionSidebar {...questionListProps} onSelect={session.goTo} />
        </aside>

        <Modal
          open={listOpen}
          title="Questions"
          placement="sheet"
          onClose={() => setListOpen(false)}
        >
          <QuestionList
            {...questionListProps}
            showHeading={false}
            onSelect={(index) => {
              session.goTo(index);
              setListOpen(false);
            }}
          />
        </Modal>

        <div className="min-w-0 flex-1">
          <PageHeader title={session.quiz.title} />

          <QuizProgressHeader
            className="mb-4"
            current={session.currentIndex + 1}
            total={session.order.length}
            answered={answeredCount}
            deadlineAt={session.deadlineAt}
            onExpire={handleFinish}
            extra={
              showLiveGrade ? (
                <LiveGrade
                  {...gradeSoFar(
                    session.quiz.questions,
                    session.answers,
                    session.submitted,
                    session.selfMarks,
                  )}
                />
              ) : undefined
            }
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
              flagged={!!session.flagged[question.id]}
              onToggleFlag={handleToggleFlag}
              onEnter={handlePrimary}
            />

            {lockedForReveal && (
              <AnswerFeedback
                question={question}
                value={value}
                selfMarking={session.config.selfMark}
                selfMark={session.selfMarks[question.id]}
                onSelfMark={(mark) => session.setSelfMark(question.id, mark)}
              />
            )}

            {saveError && (
              <div className="flex flex-col items-start gap-3">
                <ErrorNotice message={saveError} />
                <Button onClick={handleFinish}>Retry save</Button>
              </div>
            )}

            {/* Pinned to the bottom edge on phones, inline after the question elsewhere. */}
            <div className="page-gutter fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95 sm:static sm:z-auto sm:border-0 sm:bg-transparent sm:!p-0 sm:backdrop-blur-none sm:dark:bg-transparent">
              {revealAfterEach ? (
                <AfterEachNav
                  extra={listButton}
                  isFirst={isFirst}
                  isLast={isLast}
                  submitted={submitted}
                  canSubmit={isAnswered(question ?? undefined, value)}
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                  onSubmit={handleSubmitReveal}
                  onFinish={handleFinish}
                />
              ) : (
                <AtEndNav
                  extra={listButton}
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
      </div>
      </PhotoSourceProvider>
    </QuizContentProvider>
  );
}
