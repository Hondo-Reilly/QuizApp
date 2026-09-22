import type { Question, QuizGrade, UserAnswer } from "./types";

export function gradeQuestion(
  question: Question,
  userAnswer: UserAnswer,
): boolean {
  if (userAnswer === null || userAnswer === undefined) return false;

  switch (question.type) {
    case "true_false":
      return userAnswer === question.answer;
    case "multiple_choice":
      return userAnswer === question.answer;
    case "multi_answer": {
      if (!Array.isArray(userAnswer)) return false;
      const expected = new Set(question.answers);
      const actual = new Set(userAnswer);
      if (expected.size !== actual.size) return false;
      for (const id of expected) if (!actual.has(id)) return false;
      return true;
    }
  }
}

export function gradeQuiz(
  questions: readonly Question[],
  answers: Record<string, UserAnswer>,
): QuizGrade {
  const results = questions.map((q) => {
    const userAnswer = answers[q.id] ?? null;
    return {
      questionId: q.id,
      userAnswer,
      correct: gradeQuestion(q, userAnswer),
    };
  });
  const correct = results.filter((r) => r.correct).length;
  const total = results.length;
  const percent = total === 0 ? 0 : Math.round((correct / total) * 100);
  return { total, correct, percent, results };
}
