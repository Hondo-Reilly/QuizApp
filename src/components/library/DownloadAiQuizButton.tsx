import skillText from "../../../.cursor/skills/quiz-app-maker/SKILL.md?raw";
import formatText from "../../../.cursor/skills/quiz-app-maker/references/quiz-format.md?raw";
import exampleText from "../../../.cursor/skills/quiz-app-maker/references/example-quiz.json?raw";
import richExampleText from "../../../.cursor/skills/quiz-app-maker/references/example-rich-quiz.json?raw";
import { Button } from "@/components/ui/Button";
import { zipStore } from "@/lib/zipStore";

const FILENAME = "quiz-app-maker.skill";

function triggerDownload(): void {
  const blob = zipStore([
    { name: "quiz-app-maker/SKILL.md", text: skillText },
    { name: "quiz-app-maker/references/quiz-format.md", text: formatText },
    { name: "quiz-app-maker/references/example-quiz.json", text: exampleText },
    { name: "quiz-app-maker/references/example-rich-quiz.json", text: richExampleText },
  ]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = FILENAME;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function DownloadAiQuizButton() {
  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={triggerDownload}
      title="Download the quiz-app-maker skill"
    >
      Download Ai Quiz Skill
    </Button>
  );
}
