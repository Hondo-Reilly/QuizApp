import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { quizApi } from "@/api/quizApi";
import { applyMobileSession, sendMobilePatch } from "@/lib/mobileSync";
import { rememberAttempt } from "@/lib/quizPageCache";
import { useMobileStore } from "@/state/mobileStore";
import { useSessionStore } from "@/state/sessionStore";
import { gradeQuiz } from "@shared/grading";

type FinishPhase = "idle" | "finishing" | "saved";

export function useQuizFinish(quizId: string): {
  saveError: string | null;
  finish: (fromRemote: boolean) => void;
} {
  const navigate = useNavigate();
  const phase = useRef<FinishPhase>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const finish = useCallback(
    (fromRemote: boolean) => {
      if (phase.current !== "idle") return;
      phase.current = "finishing";
      setSaveError(null);
      const endedAt = useSessionStore.getState().markEnded();
      void (async () => {
        try {
          if (!fromRemote && useMobileStore.getState().active) {
            try {
              const next = await sendMobilePatch({ type: "finish" });
              if (next) applyMobileSession(next);
            } catch {
              // Leaving the quiz still stops the server.
            }
          }
          const { quiz, order, answers } = useSessionStore.getState();
          if (!quiz) throw new Error("This quiz is no longer open.");
          const ordered = order
            .map((questionId) => quiz.questions.find((q) => q.id === questionId))
            .filter((q): q is NonNullable<typeof q> => !!q);
          const grade = gradeQuiz(ordered, answers);
          const attempt = await quizApi.saveAttempt({
            quizId: quiz.id,
            startedAt: useSessionStore.getState().startedAt ?? endedAt,
            correct: grade.correct,
            total: grade.total,
            percent: grade.percent,
            questionIds: ordered.map((q) => q.id),
            answers,
          });
          rememberAttempt(attempt);
          phase.current = "saved";
          navigate(`/quiz/${quizId}/review`);
        } catch (err) {
          phase.current = "idle";
          const detail = err instanceof Error ? err.message.trim() : "";
          setSaveError(
            detail
              ? `Could not save this attempt. Your answers are still on this page. ${detail}`
              : "Could not save this attempt. Your answers are still on this page.",
          );
        }
      })();
    },
    [navigate, quizId],
  );

  return { saveError, finish };
}
