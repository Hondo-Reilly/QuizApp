import exampleQuizText from "../../../sample-quizzes/example.quiz.json?raw";
import { Button } from "@/components/ui/Button";

const FILENAME = "example_quiz.json";

function triggerDownload(): void {
  const blob = new Blob([exampleQuizText], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = FILENAME;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function DownloadExampleButton() {
  return (
    <Button size="sm" variant="secondary" onClick={triggerDownload}>
      Download example quiz
    </Button>
  );
}
