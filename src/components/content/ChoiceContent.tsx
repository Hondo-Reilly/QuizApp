import type { Choice } from "@shared/types";
import { QuizImageView } from "./QuizImageView";
import { RichText } from "./RichText";

/** A choice's text and image, used in answer buttons, lists, and review. */
export function ChoiceContent({ choice }: { choice: Pick<Choice, "text" | "image"> }) {
  if (!choice.image) return <RichText text={choice.text} inline />;
  return (
    <span className="flex flex-col items-start gap-2">
      <QuizImageView image={choice.image} size="small" />
      {choice.text.trim() && <RichText text={choice.text} inline />}
    </span>
  );
}
