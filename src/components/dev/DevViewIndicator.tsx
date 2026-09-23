import { useState } from "react";
import { useMatch } from "react-router-dom";
import { gradeQuiz } from "@shared/grading";
import type { UseLibrary } from "@/hooks/useLibrary";
import { isElectronApp } from "@/lib/runtime";
import { useSessionStore } from "@/state/sessionStore";

const STORAGE_KEY = "quizapp:devIndicator";

const chrome =
  "fixed bottom-3 left-3 z-30 border border-amber-300/80 bg-amber-50/95 font-mono text-amber-950 shadow-sm dark:border-amber-800 dark:bg-amber-950/90 dark:text-amber-100";

export function DevViewIndicator({ library }: { library: UseLibrary }) {
  const view = useDevView(library);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  if (!import.meta.env.DEV || !view) return null;

  const toggle = () => {
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "collapsed" : "expanded");
      } catch {
        // The indicator still toggles when storage is unavailable.
      }
      return next;
    });
  };

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label="Expand development indicator"
        className={`${chrome} flex h-7 w-7 items-center justify-center rounded-md`}
      >
        <PlusIcon />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Collapse development indicator"
      className={`${chrome} max-w-xs rounded-md px-2.5 py-1.5 text-left text-[11px] leading-snug`}
    >
      <div className="font-semibold uppercase tracking-wide">
        {view.name}
        <span className="ml-2 font-normal normal-case tracking-normal opacity-70">
          {view.runtime}
        </span>
      </div>
      <div>{view.component}</div>
      {view.details.map((line) => (
        <div key={line}>{line}</div>
      ))}
    </button>
  );
}

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "collapsed";
  } catch {
    return false;
  }
}

function PlusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

interface DevView {
  name: string;
  component: string;
  runtime: string;
  details: string[];
}

function useDevView(library: UseLibrary): DevView | null {
  const folderMatch = useMatch("/folder/:folderId");
  const attemptMatch = useMatch("/quiz/:id/attempt/:attemptId");
  const setupMatch = useMatch("/quiz/:id/setup");
  const takeMatch = useMatch("/quiz/:id/take");
  const reviewMatch = useMatch("/quiz/:id/review");
  const quizMatch = useMatch("/quiz/:id");

  const sessionQuiz = useSessionStore((state) => state.quiz);
  const order = useSessionStore((state) => state.order);
  const currentIndex = useSessionStore((state) => state.currentIndex);
  const answers = useSessionStore((state) => state.answers);
  const submitted = useSessionStore((state) => state.submitted);
  const revealMode = useSessionStore((state) => state.config.revealMode);
  const deadlineAt = useSessionStore((state) => state.deadlineAt);

  const runtime = isElectronApp() ? "electron" : "web";
  const quizId =
    attemptMatch?.params.id ??
    setupMatch?.params.id ??
    takeMatch?.params.id ??
    reviewMatch?.params.id ??
    quizMatch?.params.id ??
    null;
  const meta = quizId
    ? (library.quizzes.find((quiz) => quiz.id === quizId) ?? null)
    : null;
  const title =
    sessionQuiz && sessionQuiz.id === quizId ? sessionQuiz.title : meta?.title;

  if (folderMatch) {
    const folderId = folderMatch.params.folderId ?? "";
    const folder = library.folderById.get(folderId);
    return {
      name: "Folder",
      component: "LibraryPage",
      runtime,
      details: [
        folder?.name ?? "Missing folder",
        folderId,
        `${library.foldersIn(folderId).length} folders · ${library.quizzesIn(folderId).length} quizzes`,
      ],
    };
  }

  if (attemptMatch) {
    return {
      name: "Attempt",
      component: "QuizAttemptPage",
      runtime,
      details: [
        title ?? "Quiz",
        quizId ?? "",
        attemptMatch.params.attemptId ?? "",
      ].filter(Boolean),
    };
  }

  if (setupMatch) {
    return {
      name: "Setup",
      component: "QuizSetupPage",
      runtime,
      details: quizLines(title, quizId, meta?.questionCount),
    };
  }

  if (takeMatch) {
    const questionId = order[currentIndex];
    const question = sessionQuiz?.questions.find((item) => item.id === questionId);
    const submittedCount = order.filter((id) => submitted[id]).length;
    return {
      name: "Take",
      component: "TakeQuizPage",
      runtime,
      details: [
        sessionQuiz?.title ?? title ?? "Quiz",
        order.length > 0
          ? `${currentIndex + 1} / ${order.length} · ${submittedCount} submitted`
          : "No session",
        question ? `${question.type} · ${question.id}` : "",
        revealMode === "after_each" ? "Reveal after each" : "Reveal at end",
        deadlineAt ? "Timed" : "No time limit",
      ].filter(Boolean),
    };
  }

  if (reviewMatch) {
    const questions =
      sessionQuiz?.questions.filter((question) => order.includes(question.id)) ??
      [];
    const grade =
      sessionQuiz && questions.length > 0 ? gradeQuiz(questions, answers) : null;
    return {
      name: "Review",
      component: "ReviewPage",
      runtime,
      details: [
        sessionQuiz?.title ?? title ?? "Quiz",
        grade ? `${grade.correct} / ${grade.total} · ${grade.percent}%` : "No session",
      ],
    };
  }

  if (quizMatch) {
    return {
      name: "Quiz",
      component: "QuizBrowsePage",
      runtime,
      details: quizLines(title, quizId, meta?.questionCount),
    };
  }

  return {
    name: "Library",
    component: "LibraryPage",
    runtime,
    details: [
      library.loading
        ? "Loading"
        : `${library.foldersIn(null).length} folders · ${library.quizzesIn(null).length} quizzes`,
      library.error ?? "",
    ].filter(Boolean),
  };
}

function quizLines(
  title: string | undefined,
  quizId: string | null,
  questionCount: number | undefined,
): string[] {
  return [
    title ?? "Quiz",
    quizId ?? "",
    questionCount != null ? `${questionCount} questions` : "",
  ].filter(Boolean);
}
