import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { isOpenQuestion } from "@shared/questionTypes";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DetailPageLayout } from "@/components/ui/DetailPageLayout";
import { LoadingMessage, PageErrorState } from "@/components/ui/PageState";
import { Toggle } from "@/components/ui/Toggle";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { NumberField } from "@/components/ui/NumberField";
import { SetupSection } from "@/components/quiz/SetupSection";
import type { UseLibrary } from "@/hooks/useLibrary";
import { useQuizSetup } from "@/hooks/useQuizSetup";
import { isElectronApp } from "@/lib/runtime";
import type { RevealMode } from "@shared/types";

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
  const folderId = library.quizzes.find((item) => item.id === id)?.folderId ?? null;
  const setup = useQuizSetup(id, folderId);

  if (setup.loading) return <LoadingMessage />;
  if (setup.error) {
    return (
      <PageErrorState
        message={setup.error}
        backLabel="Back to library"
        onBack={() => navigate("/")}
      />
    );
  }
  if (!setup.quiz) return null;

  const total = setup.quiz.questions.length;
  const usingSubset = setup.questionCount > 0 && setup.questionCount < total;

  return (
    <DetailPageLayout
      width="2xl"
      onBack={setup.back}
      title={setup.quiz.title}
      subtitle={setup.quiz.description ?? "Configure this attempt and start."}
    >
      <Card className="flex flex-col gap-6">
        <SetupSection
          title="Number of questions"
          hint="Use a random subset of this quiz's question bank, or leave at the maximum to use them all."
        >
          <NumberField
            value={setup.questionCount}
            min={1}
            max={total}
            onChange={setup.setQuestionCount}
            suffix={`of ${total}`}
            disabled={total <= 1}
          />
          {usingSubset && (
            <p className="mt-2 text-xs text-slate-500 dark:text-neutral-400">
              {setup.questionCount} questions will be picked at random from the
              bank.
            </p>
          )}
        </SetupSection>

        <SetupSection title="Randomization">
          <div className="flex flex-col gap-3">
            <Toggle
              checked={usingSubset || setup.shuffleQuestions}
              onChange={setup.setShuffleQuestions}
              disabled={usingSubset}
              label="Shuffle questions"
              description={
                usingSubset
                  ? "A smaller set is always shown in a random order."
                  : "Randomize the order of questions for this attempt."
              }
            />
            <Toggle
              checked={setup.shuffleChoices}
              onChange={setup.setShuffleChoices}
              label="Shuffle answer choices"
              description="Randomize the order of choices for multiple-choice and select-all questions."
            />
          </div>
        </SetupSection>

        <SetupSection title="Reveal answers">
          <RadioGroup
            name="reveal"
            value={setup.revealMode}
            options={REVEAL_OPTIONS}
            onChange={setup.setRevealMode}
          />
        </SetupSection>

        {setup.quiz?.questions.some(isOpenQuestion) && (
          <SetupSection title="Written and photo answers">
            <Toggle
              checked={setup.selfMark}
              onChange={setup.setSelfMark}
              label="Mark my own answers"
              description="QuizApp can't grade written or photo answers. With this on, you compare each one to the sample answer and choose I got it, I missed it, or I'm not sure. Marked answers count toward your score."
            />
          </SetupSection>
        )}

        <SetupSection title="Time limit">
          <Toggle
            checked={setup.timeLimitEnabled}
            onChange={setup.setTimeLimitEnabled}
            label="Time limit"
            description="Stop the quiz when the time runs out. Unanswered questions are marked incorrect."
          />
          {setup.timeLimitEnabled && (
            <div className="mt-3">
              <NumberField
                value={setup.timeLimitMinutes}
                min={1}
                max={9999}
                onChange={setup.setTimeLimitMinutes}
                suffix="minutes"
              />
            </div>
          )}
        </SetupSection>

        {isElectronApp() && (
          <SetupSection title="Mobile mode">
            <Toggle
              checked={setup.enableMobile}
              onChange={setup.setEnableMobile}
              label="Enable mobile mode"
              description="A phone on the same Wi-Fi can take this quiz with you. The QR code appears after the quiz starts."
            />
          </SetupSection>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={setup.back}>
            Cancel
          </Button>
          <Button onClick={setup.handleStart}>Start quiz</Button>
        </div>
      </Card>
    </DetailPageLayout>
  );
}
