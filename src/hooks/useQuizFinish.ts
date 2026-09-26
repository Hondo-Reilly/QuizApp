import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { quizApi } from "@/api/quizApi";
import { applyMobileSession, sendMobilePatch } from "@/lib/mobileSync";
import { rememberAttempt } from "@/lib/quizPageCache";
import { useMobileStore } from "@/state/mobileStore";
import { useSessionStore } from "@/state/sessionStore";
import { gradeQuiz } from "@shared/grading";
import { attemptPhotoNames } from "@shared/attemptRecord";
import { pendingPhotoData } from "@/state/photoStore";
import type { AttemptPhoto, UserAnswer } from "@shared/types";

type FinishPhase = "idle" | "finishing" | "saved";

/** Photo data for every photo the answers use, including ones still on the phone. */
async function collectPhotos(answers: Record<string, UserAnswer>): Promise<AttemptPhoto[]> {
  const names = attemptPhotoNames({ answers });
  const out: AttemptPhoto[] = [];
  for (const name of names) {
    const data = pendingPhotoData(name) ?? (await quizApi.getMobilePhoto(name).catch(() => null));
    if (!data) throw new Error(`A photo for your answers is missing (${name}).`);
    out.push({ name, data });
  }
  return out;
}

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
          const { quiz, order, answers, flagged, selfMarks, config } =
            useSessionStore.getState();
          if (!quiz) throw new Error("This quiz is no longer open.");
          const ordered = order
            .map((questionId) => quiz.questions.find((q) => q.id === questionId))
            .filter((q): q is NonNullable<typeof q> => !!q);
          const grade = gradeQuiz(ordered, answers, config.selfMark ? selfMarks : {});
          const photos = await collectPhotos(answers);
          const attempt = await quizApi.saveAttempt({
            quizId: quiz.id,
            startedAt: useSessionStore.getState().startedAt ?? endedAt,
            correct: grade.correct,
            total: grade.total,
            percent: grade.percent,
            ungraded: grade.ungraded,
            selfMarking: config.selfMark,
            selfMarks: config.selfMark ? selfMarks : undefined,
            photos,
            questionIds: ordered.map((q) => q.id),
            answers,
            flagged: order.filter((questionId) => flagged[questionId]),
          });
          useSessionStore.getState().setSavedAttemptId(attempt.id);
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
