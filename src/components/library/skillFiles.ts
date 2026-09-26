import makerSkill from "../../../.cursor/skills/quiz-app-maker/SKILL.md?raw";
import makerFormat from "../../../.cursor/skills/quiz-app-maker/references/quiz-format.md?raw";
import makerExample from "../../../.cursor/skills/quiz-app-maker/references/example-quiz.json?raw";
import makerRichExample from "../../../.cursor/skills/quiz-app-maker/references/example-rich-quiz.json?raw";
import makerWrittenExample from "../../../.cursor/skills/quiz-app-maker/references/example-written-quiz.json?raw";
import reviewerSkill from "../../../.cursor/skills/quiz-attempt-reviewer/SKILL.md?raw";
import reviewerFormat from "../../../.cursor/skills/quiz-attempt-reviewer/references/attempt-export-format.md?raw";
import reviewerExample from "../../../.cursor/skills/quiz-attempt-reviewer/references/example-attempt-export.json?raw";
import reviewerWrittenExample from "../../../.cursor/skills/quiz-attempt-reviewer/references/example-written-attempt.json?raw";

/** The files of each downloadable Claude skill, keyed by skill name. */
export const skillFiles: Record<string, { path: string; text: string }[]> = {
  "quiz-app-maker": [
    { path: "SKILL.md", text: makerSkill },
    { path: "references/quiz-format.md", text: makerFormat },
    { path: "references/example-quiz.json", text: makerExample },
    { path: "references/example-rich-quiz.json", text: makerRichExample },
    { path: "references/example-written-quiz.json", text: makerWrittenExample },
  ],
  "quiz-attempt-reviewer": [
    { path: "SKILL.md", text: reviewerSkill },
    { path: "references/attempt-export-format.md", text: reviewerFormat },
    { path: "references/example-attempt-export.json", text: reviewerExample },
    { path: "references/example-written-attempt.json", text: reviewerWrittenExample },
  ],
};
