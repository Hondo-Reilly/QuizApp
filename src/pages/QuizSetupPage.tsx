import { useEffect, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { quizApi } from "@/api/quizApi";
import { Card } from "@/components/ui/Card";
import { BackLink } from "@/components/ui/BackLink";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { NumberField } from "@/components/ui/NumberField";
import { PageHeader } from "@/components/ui/PageHeader";
import type { UseLibrary } from "@/hooks/useLibrary";
import { useQuizSession } from "@/hooks/useQuizSession";
import { startMobileSession } from "@/lib/mobileSync";
import { isElectronApp } from "@/lib/runtime";
import {
  readQuizSetupPreferences,
  writeQuizSetupPreferences,
} from "@/lib/quizPreferences";
import {
  readQuizTimeSettings,
  writeQuizTimeSettings,
} from "@/lib/quizTimeSettings";
import type { Quiz, RevealMode } from "@shared/types";

const REVEAL_OPTIONS: ReadonlyArray<{
  value: RevealMode;
  label: string;
  description?: string;
}> = [
  {
    value: "after_each",
    label: "After each question",
    description: "See the correct answer and explanation right after submitting.",
  },
  {
    value: "at_end",
    label: "At the end",
    description: "Wait until the quiz is finished to review your answers.",
  },
];

export function QuizSetupPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const library = useOutletContext<UseLibrary>();
  const folderId =
    library.quizzes.find((item) => item.id === id)?.folderId ?? null;
  const start = useQuizSession((s) => s.start);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const saved = readQuizSetupPreferences();
  const [shuffleQuestions, setShuffleQuestions] = useState(
    saved.shuffleQuestions,
  );
  const [shuffleChoices, setShuffleChoices] = useState(saved.shuffleChoices);
  const [revealMode, setRevealMode] = useState<RevealMode>(saved.revealMode);
  const [enableMobile, setEnableMobile] = useState(saved.enableMobile);
  const [questionCount, setQuestionCount] = useState(0);
  const [timeLimitEnabled, setTimeLimitEnabled] = useState(false);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(60);
  const [timeSettingsQuizId, setTimeSettingsQuizId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    quizApi
      .getQuiz(id)
      .then((q) => {
        if (!active) return;
        if (!q) {
          setError("Quiz not found.");
        } else {
          setQuiz(q);
          setQuestionCount(q.questions.length);
        }
      })
      .catch((err) => active && setError(String(err)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    writeQuizSetupPreferences({
      shuffleQuestions,
      shuffleChoices,
      revealMode,
      enableMobile,
    });
  }, [shuffleQuestions, shuffleChoices, revealMode, enableMobile]);

  useEffect(() => {
    const saved = readQuizTimeSettings(id);
    setTimeLimitEnabled(saved.timeLimitEnabled);
    setTimeLimitMinutes(saved.timeLimitMinutes);
    setTimeSettingsQuizId(id);
  }, [id]);

  useEffect(() => {
    if (timeSettingsQuizId !== id) return;
    writeQuizTimeSettings(id, { timeLimitEnabled, timeLimitMinutes });
  }, [id, timeSettingsQuizId, timeLimitEnabled, timeLimitMinutes]);

  const back = () => navigate(folderId ? `/folder/${folderId}` : "/");

  const handleStart = () => {
    if (!quiz) return;
    const subset =
      questionCount > 0 && questionCount < quiz.questions.length;
    start(quiz, {
      shuffleQuestions: subset || shuffleQuestions,
      shuffleChoices,
      revealMode,
      questionCount,
      timeLimitMinutes: timeLimitEnabled
        ? Math.max(1, timeLimitMinutes)
        : null,
    });
    navigate(`/quiz/${id}/take`);
    if (enableMobile && isElectronApp()) {
      void startMobileSession().catch(() => undefined);
    }
  };

  if (loading)
    return (
      <div className="text-sm text-slate-500 dark:text-neutral-400">
        Loading...
      </div>
    );
  if (error)
    return (
      <div>
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
        <Button variant="secondary" onClick={() => navigate("/")}>
          Back to library
        </Button>
      </div>
    );
  if (!quiz) return null;

  const total = quiz.questions.length;
  const usingSubset = questionCount > 0 && questionCount < total;

  return (
    <div className="mx-auto max-w-2xl">
      <BackLink onClick={back} />
      <PageHeader
        title={quiz.title}
        subtitle={quiz.description ?? "Configure this attempt and start."}
      />

      <Card className="flex flex-col gap-6">
        <div>
          <h2 className="mb-1 text-sm font-semibold text-slate-700 dark:text-neutral-300">
            Number of questions
          </h2>
          <p className="mb-2 text-xs text-slate-500 dark:text-neutral-400">
            Use a random subset of this quiz&apos;s question bank, or leave at
            the maximum to use them all.
          </p>
          <NumberField
            value={questionCount}
            min={1}
            max={total}
            onChange={setQuestionCount}
            suffix={`of ${total}`}
            disabled={total <= 1}
          />
          {usingSubset && (
            <p className="mt-2 text-xs text-slate-500 dark:text-neutral-400">
              {questionCount} questions will be picked at random from the
              bank.
            </p>
          )}
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-neutral-300">
            Randomization
          </h2>
          <div className="flex flex-col gap-3">
            <Toggle
              checked={usingSubset || shuffleQuestions}
              onChange={setShuffleQuestions}
              disabled={usingSubset}
              label="Shuffle questions"
              description={
                usingSubset
                  ? "A smaller set is always shown in a random order."
                  : "Randomize the order of questions for this attempt."
              }
            />
            <Toggle
              checked={shuffleChoices}
              onChange={setShuffleChoices}
              label="Shuffle answer choices"
              description="Randomize the order of choices for multiple-choice and select-all questions."
            />
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-neutral-300">
            Reveal answers
          </h2>
          <RadioGroup
            name="reveal"
            value={revealMode}
            options={REVEAL_OPTIONS}
            onChange={setRevealMode}
          />
        </div>

        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-neutral-300">
            Time limit
          </h2>
          <Toggle
            checked={timeLimitEnabled}
            onChange={setTimeLimitEnabled}
            label="Time limit"
            description="Stop the quiz when the time runs out. Unanswered questions are marked incorrect."
          />
          {timeLimitEnabled && (
            <div className="mt-3">
              <NumberField
                value={timeLimitMinutes}
                min={1}
                max={9999}
                onChange={setTimeLimitMinutes}
                suffix="minutes"
              />
            </div>
          )}
        </div>

        {isElectronApp() && (
          <div>
            <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-neutral-300">
              Mobile mode
            </h2>
            <Toggle
              checked={enableMobile}
              onChange={setEnableMobile}
              label="Enable mobile mode"
              description="A phone on the same Wi-Fi can take this quiz with you. The QR code appears after the quiz starts."
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={back}>
            Cancel
          </Button>
          <Button onClick={handleStart}>Start quiz</Button>
        </div>
      </Card>
    </div>
  );
}
