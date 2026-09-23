import { useEffect, useState } from "react";
import { AnswerFeedback } from "@/components/quiz/AnswerFeedback";
import { AfterEachNav } from "@/components/quiz/AfterEachNav";
import { AtEndNav } from "@/components/quiz/AtEndNav";
import { QuizProgressHeader } from "@/components/quiz/QuizProgressHeader";
import { QuestionCard } from "@/components/quiz/QuestionCard";
import { countAnswered, hasAnswer } from "@shared/answers";
import { gradeQuestion } from "@shared/grading";
import type { MobilePatch, MobileSession } from "@shared/mobile";

export function MobileQuiz() {
  const [session, setSession] = useState<MobileSession | null>(null);
  const [ended, setEnded] = useState<"finished" | "stopped" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.theme !== "dark" && session?.theme !== "light") return;
    document.documentElement.classList.toggle("dark", session.theme === "dark");
  }, [session?.theme]);

  useEffect(() => {
    let cancelled = false;

    const apply = (next: MobileSession) => {
      if (cancelled) return;
      setSession((current) => {
        if (current && next.rev < current.rev) return current;
        return next;
      });
      if (next.finished) setEnded("finished");
    };

    void fetch("/session")
      .then(async (response) => {
        if (!response.ok) throw new Error("Mobile mode is not running.");
        const data: unknown = await response.json();
        if (!isSession(data)) throw new Error("Mobile mode is not running.");
        apply(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Could not open the quiz.",
        );
      });

    const events = new EventSource("/events");
    events.onmessage = (event) => {
      const data: unknown = JSON.parse(event.data);
      if (isSession(data)) apply(data);
    };
    events.addEventListener("end", (event) => {
      const message = event as MessageEvent<string>;
      const data = JSON.parse(message.data) as { reason?: string };
      setEnded(data.reason === "finished" ? "finished" : "stopped");
      events.close();
    });

    return () => {
      cancelled = true;
      events.close();
    };
  }, []);

  if (ended === "finished") {
    return <Status message="Quiz finished." />;
  }
  if (ended === "stopped") {
    return <Status message="Mobile mode ended." />;
  }
  if (error && !session) {
    return <Status message={error} />;
  }
  if (!session) {
    return <Status message="Connecting…" />;
  }

  const questionId = session.order[session.currentIndex];
  const question = session.quiz.questions.find((item) => item.id === questionId);
  if (!question) return <Status message="This question is unavailable." />;

  const value = session.answers[question.id] ?? null;
  const submitted = !!session.submitted[question.id];
  const revealAfterEach = session.revealMode === "after_each";
  const locked = revealAfterEach && submitted;
  const answeredCount = countAnswered(session.order, session.answers);
  const allAnswered = answeredCount === session.order.length;
  const isFirst = session.currentIndex === 0;
  const isLast = session.currentIndex >= session.order.length - 1;

  const send = (patch: MobilePatch) => {
    void fetch("/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
      .then(async (response) => {
        if (!response.ok) return;
        const data: unknown = await response.json();
        if (isSession(data)) {
          setSession((current) => {
            if (current && data.rev < current.rev) return current;
            return data;
          });
          if (data.finished) setEnded("finished");
        }
      })
      .catch(() => {
        setError("Could not update the quiz.");
      });
  };

  return (
    <main className="mx-auto flex min-h-full w-full max-w-lg flex-col gap-4 px-4 py-6">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-neutral-100">
        {session.quiz.title}
      </h1>
      <QuizProgressHeader
        current={session.currentIndex + 1}
        total={session.order.length}
        answered={answeredCount}
        deadlineAt={session.deadlineAt}
        onExpire={() => send({ type: "finish" })}
      />
      <QuestionCard
        question={question}
        value={value}
        onChange={(next) =>
          send({ type: "answer", questionId: question.id, answer: next })
        }
        reveal={locked}
        disabled={locked}
        choiceOrder={session.choicesOrder[question.id]}
      />
      {locked && (
        <AnswerFeedback
          correct={gradeQuestion(question, value)}
          explanation={question.explanation}
        />
      )}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {revealAfterEach ? (
        <AfterEachNav
          isFirst={isFirst}
          isLast={isLast}
          submitted={submitted}
          canSubmit={hasAnswer(value)}
          onPrevious={() => send({ type: "index", currentIndex: session.currentIndex - 1 })}
          onNext={() => send({ type: "index", currentIndex: session.currentIndex + 1 })}
          onSubmit={() => send({ type: "submit", questionId: question.id })}
          onFinish={() => send({ type: "finish" })}
        />
      ) : (
        <AtEndNav
          isFirst={isFirst}
          isLast={isLast}
          showSubmit={allAnswered || isLast}
          onPrevious={() => send({ type: "index", currentIndex: session.currentIndex - 1 })}
          onNext={() => send({ type: "index", currentIndex: session.currentIndex + 1 })}
          onSubmit={() => send({ type: "finish" })}
        />
      )}
    </main>
  );
}

function Status({ message }: { message: string }) {
  return (
    <main className="flex min-h-full w-full items-center justify-center px-6">
      <p className="text-center text-lg font-bold text-slate-800 dark:text-neutral-100">
        {message}
      </p>
    </main>
  );
}

function isSession(value: unknown): value is MobileSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<MobileSession>;
  return typeof session.rev === "number" && Array.isArray(session.order);
}
