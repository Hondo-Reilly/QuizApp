import { z } from "zod";
import type { Quiz } from "./types";

const choiceSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});

const scenarioSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).optional(),
  text: z.string().min(1),
});

const uniqueChoiceIds = (choices: { id: string }[]) =>
  new Set(choices.map((c) => c.id)).size === choices.length;

const baseQuestion = z.object({
  id: z.string().min(1),
  scenarioId: z.string().min(1).optional(),
  prompt: z.string().min(1),
  explanation: z.string().optional(),
});

const trueFalseSchema = baseQuestion.extend({
  type: z.literal("true_false"),
  answer: z.boolean(),
});

const multipleChoiceSchema = baseQuestion
  .extend({
    type: z.literal("multiple_choice"),
    choices: z.array(choiceSchema).min(2),
    answer: z.string().min(1),
  })
  .refine((q) => uniqueChoiceIds(q.choices), {
    message: "Choice ids must be unique",
    path: ["choices"],
  })
  .refine((q) => q.choices.some((c) => c.id === q.answer), {
    message: "answer must match one of the choice ids",
    path: ["answer"],
  });

const multiAnswerSchema = baseQuestion
  .extend({
    type: z.literal("multi_answer"),
    choices: z.array(choiceSchema).min(2),
    answers: z.array(z.string().min(1)).min(1),
  })
  .refine((q) => uniqueChoiceIds(q.choices), {
    message: "Choice ids must be unique",
    path: ["choices"],
  })
  .refine(
    (q) => {
      const ids = new Set(q.choices.map((c) => c.id));
      return q.answers.every((a) => ids.has(a));
    },
    { message: "answers must reference choice ids", path: ["answers"] },
  )
  .refine((q) => new Set(q.answers).size === q.answers.length, {
    message: "answers must be unique",
    path: ["answers"],
  });

export const questionSchema = z.union([
  trueFalseSchema,
  multipleChoiceSchema,
  multiAnswerSchema,
]);

export const quizSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1).optional(),
    title: z.string().min(1),
    description: z.string().optional(),
    author: z.string().optional(),
    tags: z.array(z.string()).optional(),
    scenarios: z.array(scenarioSchema).optional(),
    questions: z.array(questionSchema).min(1),
  })
  .superRefine((quiz, ctx) => {
    const scenarioIds = new Set<string>();
    quiz.scenarios?.forEach((scenario, index) => {
      if (scenarioIds.has(scenario.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate scenario id "${scenario.id}"`,
          path: ["scenarios", index, "id"],
        });
      }
      scenarioIds.add(scenario.id);
    });
    quiz.questions.forEach((question, index) => {
      if (question.scenarioId && !scenarioIds.has(question.scenarioId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `scenarioId "${question.scenarioId}" does not match a scenario`,
          path: ["questions", index, "scenarioId"],
        });
      }
    });

    const seen = new Set<string>();
    quiz.questions.forEach((question, index) => {
      if (seen.has(question.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate question id "${question.id}"`,
          path: ["questions", index, "id"],
        });
        return;
      }
      seen.add(question.id);
    });
  });

export type ParsedQuizInput = z.infer<typeof quizSchema>;

export function parseQuiz(raw: unknown): ParsedQuizInput {
  return quizSchema.parse(raw);
}

export function isQuiz(value: unknown): value is Quiz {
  return quizSchema.safeParse(value).success;
}
