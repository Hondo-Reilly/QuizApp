import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { quizApi } from "@/api/quizApi";
import { startMobileSession } from "@/lib/mobileSync";
import {
  readQuizSetupPreferences,
  writeQuizSetupPreferences,
} from "@/lib/quizPreferences";
import {
  readQuizTimeSettings,
  writeQuizTimeSettings,
} from "@/lib/quizTimeSettings";
import { isElectronApp } from "@/lib/runtime";
import { useSessionStore } from "@/state/sessionStore";
import type { Quiz, RevealMode } from "@shared/types";

export function useQuizSetup(quizId: string, folderId: string | null) {
  const navigate = useNavigate();
  const start = useSessionStore((state) => state.start);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const saved = readQuizSetupPreferences();
  const [shuffleQuestions, setShuffleQuestions] = useState(saved.shuffleQuestions);
  const [shuffleChoices, setShuffleChoices] = useState(saved.shuffleChoices);
  const [revealMode, setRevealMode] = useState<RevealMode>(saved.revealMode);
  const [enableMobile, setEnableMobile] = useState(saved.enableMobile);
  const [questionCount, setQuestionCount] = useState(0);
  const [timeLimitEnabled, setTimeLimitEnabled] = useState(false);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(60);
  const [timeSettingsQuizId, setTimeSettingsQuizId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    quizApi
      .getQuiz(quizId)
      .then((loaded) => {
        if (!active) return;
        if (!loaded) setError("Quiz not found.");
        else {
          setQuiz(loaded);
          setQuestionCount(loaded.questions.length);
        }
      })
      .catch((err) => active && setError(String(err)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [quizId]);

  useEffect(() => {
    writeQuizSetupPreferences({
      shuffleQuestions,
      shuffleChoices,
      revealMode,
      enableMobile,
    });
  }, [shuffleQuestions, shuffleChoices, revealMode, enableMobile]);

  useEffect(() => {
    const time = readQuizTimeSettings(quizId);
    setTimeLimitEnabled(time.timeLimitEnabled);
    setTimeLimitMinutes(time.timeLimitMinutes);
    setTimeSettingsQuizId(quizId);
  }, [quizId]);

  useEffect(() => {
    if (timeSettingsQuizId !== quizId) return;
    writeQuizTimeSettings(quizId, { timeLimitEnabled, timeLimitMinutes });
  }, [quizId, timeSettingsQuizId, timeLimitEnabled, timeLimitMinutes]);

  const back = () => navigate(folderId ? `/folder/${folderId}` : "/");

  const handleStart = () => {
    if (!quiz) return;
    const subset = questionCount > 0 && questionCount < quiz.questions.length;
    start(quiz, {
      shuffleQuestions: subset || shuffleQuestions,
      shuffleChoices,
      revealMode,
      questionCount,
      timeLimitMinutes: timeLimitEnabled ? Math.max(1, timeLimitMinutes) : null,
    });
    navigate(`/quiz/${quizId}/take`);
    if (enableMobile && isElectronApp()) {
      void startMobileSession().catch(() => undefined);
    }
  };

  return {
    quiz,
    loading,
    error,
    shuffleQuestions,
    setShuffleQuestions,
    shuffleChoices,
    setShuffleChoices,
    revealMode,
    setRevealMode,
    enableMobile,
    setEnableMobile,
    questionCount,
    setQuestionCount,
    timeLimitEnabled,
    setTimeLimitEnabled,
    timeLimitMinutes,
    setTimeLimitMinutes,
    back,
    handleStart,
  };
}
