import { PhotoGallery } from "@/components/content/PhotoGallery";
import { RichText } from "@/components/content/RichText";
import { isCodeQuestion, photosOf } from "@shared/questionTypes";
import type { OpenQuestion, UserAnswer } from "@shared/types";
import { CodeBlock } from "./CodeEditor";

const label = "text-xs uppercase tracking-wide text-slate-500 dark:text-neutral-400";

/** The user's own written, code, or photo answer. */
export function OpenAnswerView({
  question,
  answer,
  photoSize = "large",
}: {
  question: OpenQuestion;
  answer: UserAnswer | undefined;
  photoSize?: "large" | "small";
}) {
  if (question.type === "image_response") {
    const photos = photosOf(answer);
    if (photos.length === 0) return <p className="text-sm text-slate-500 dark:text-neutral-400">No answer</p>;
    return <PhotoGallery names={photos} size={photoSize} />;
  }
  const text = typeof answer === "string" ? answer : "";
  if (!text.trim()) return <p className="text-sm text-slate-500 dark:text-neutral-400">No answer</p>;
  if (isCodeQuestion(question)) return <CodeBlock code={text} language={question.language} />;
  return (
    <p className="whitespace-pre-wrap break-words text-sm text-slate-800 dark:text-neutral-200">{text}</p>
  );
}

/** The quiz's sample answer and rubric points, when it has them. */
export function SampleAnswerView({ question }: { question: OpenQuestion }) {
  const { sampleAnswer, rubric } = question;
  if (!sampleAnswer && !rubric?.length) return null;
  return (
    <div className="flex flex-col gap-3">
      {sampleAnswer && (
        <div className="flex flex-col gap-1.5">
          <div className={label}>Sample answer</div>
          {isCodeQuestion(question) ? (
            <CodeBlock code={sampleAnswer} language={question.language} />
          ) : (
            <RichText text={sampleAnswer} preserveLines className="text-sm text-slate-800 dark:text-neutral-200" />
          )}
        </div>
      )}
      {rubric && rubric.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className={label}>A good answer covers</div>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-neutral-300">
            {rubric.map((point, index) => (
              <li key={index}>
                <RichText text={point} inline />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
