import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import { attemptQuestions, quizForAttempt, withQuizSnapshots } from "@shared/attemptRecord";
import {
  addChoice,
  addMatchItem,
  addQuestion,
  addScenario,
  blankQuestion,
  blankQuiz,
  changeQuestionType,
  duplicateQuestion,
  moveItem,
  moveQuestion,
  removeChoice,
  removeScenario,
  uniqueId,
  updateQuestion,
} from "@shared/quizEdits";
import { describeIssue, quizIssues } from "@shared/quizIssues";
import { missingImage, prepareSavedQuiz, savedMetadata } from "@shared/quizSave";
import type { MultipleChoiceQuestion, Question, Quiz, QuizAttempt } from "@shared/types";
import { makeQuiz } from "./fixtures/quiz";

const userData = await fs.mkdtemp(path.join(os.tmpdir(), "quizapp-editing-"));

vi.mock("electron", () => ({
  app: { getPath: () => userData, getAppPath: () => userData },
  BrowserWindow: { getAllWindows: () => [] },
}));

const store = await import("../electron/lib/fileStore");
const attempts = await import("../electron/lib/attemptStore");

afterAll(async () => {
  await fs.rm(userData, { recursive: true, force: true });
});

function mc(): MultipleChoiceQuestion {
  return {
    id: "q1",
    type: "multiple_choice",
    prompt: "Pick B",
    choices: [
      { id: "a", text: "A" },
      { id: "b", text: "B" },
      { id: "c", text: "C" },
    ],
    answer: "b",
    explanation: "B it is.",
  };
}

function attemptOf(quiz: Quiz, extra: Partial<QuizAttempt> = {}): QuizAttempt {
  return {
    id: "att1",
    quizId: quiz.id,
    completedAt: "2026-10-01T00:00:00.000Z",
    correct: 1,
    total: 1,
    percent: 100,
    questionIds: quiz.questions.map((question) => question.id),
    answers: {},
    ...extra,
  };
}

describe("quiz edits", () => {
  it("picks the first free id", () => {
    expect(uniqueId("q", ["q1", "q2", "q4"])).toBe("q3");
    expect(uniqueId("", [])).toBe("1");
  });

  it("starts every question type empty and valid in shape", () => {
    for (const type of [
      "true_false",
      "multiple_choice",
      "multi_answer",
      "numeric",
      "matching",
      "short_answer",
      "long_answer",
      "image_response",
    ] as const) {
      const question = blankQuestion(type, ["q1"]);
      expect(question.type).toBe(type);
      expect(question.id).toBe("q2");
      expect(question.prompt).toBe("");
      if ("choices" in question) expect(question.choices.every((choice) => choice.text === "")).toBe(true);
    }
  });

  it("carries choices and answers between choice types", () => {
    const multi = changeQuestionType(mc(), "multi_answer");
    expect(multi).toMatchObject({ type: "multi_answer", answers: ["b"], explanation: "B it is." });
    expect(changeQuestionType(multi, "multiple_choice")).toMatchObject({ answer: "b" });
    const fromTf = changeQuestionType({ id: "t", type: "true_false", prompt: "P", answer: false }, "multiple_choice");
    expect(fromTf).toMatchObject({ choices: [{ text: "True" }, { text: "False" }], answer: "b" });
    const matching = changeQuestionType(mc(), "matching");
    expect(matching).toMatchObject({ choices: mc().choices, items: [{ id: "1", text: "", answer: "" }] });
    expect(changeQuestionType(mc(), "multiple_choice")).toEqual(mc());
  });

  it("keeps the sample answer between written types and drops it elsewhere", () => {
    const short: Question = { id: "s", type: "short_answer", prompt: "P", sampleAnswer: "S", rubric: ["R"], maxLength: 50 };
    expect(changeQuestionType(short, "long_answer")).toEqual({
      id: "s", type: "long_answer", prompt: "P", sampleAnswer: "S", rubric: ["R"],
      scenarioId: undefined, image: undefined, explanation: undefined,
    });
    expect(changeQuestionType(short, "numeric")).not.toHaveProperty("sampleAnswer");
  });

  it("clears answers that point at a removed choice", () => {
    expect(removeChoice(mc(), "b")).toMatchObject({ answer: "", choices: [{ id: "a" }, { id: "c" }] });
    expect(removeChoice(mc(), "a").answer).toBe("b");
    const multi = changeQuestionType(mc(), "multi_answer");
    expect(removeChoice(multi as never, "b")).toMatchObject({ answers: [] });
    const matching = changeQuestionType(mc(), "matching");
    if (matching.type !== "matching") throw new Error("Bad conversion");
    const matched = { ...matching, items: [{ id: "1", text: "x", answer: "c" }] };
    expect(removeChoice(matched, "c").items[0].answer).toBe("");
    expect(addChoice(mc()).choices.at(-1)).toEqual({ id: "d", text: "" });
    expect(addMatchItem(matched).items.map((item) => item.id)).toEqual(["1", "2"]);
  });

  it("adds, moves, duplicates, and updates questions without changing the input", () => {
    const quiz = makeQuiz();
    const before = structuredClone(quiz);
    const dup = duplicateQuestion(quiz, "single");
    expect(dup.questions.map((question) => question.id)).toEqual(["tf", "single", "q1", "multi"]);
    expect(dup.questions[2].prompt).toBe(quiz.questions[1].prompt);
    expect(moveQuestion(quiz, 0, 2).questions.map((question) => question.id)).toEqual(["single", "multi", "tf"]);
    expect(addQuestion(quiz, mc(), 1).questions[1].id).toBe("q1");
    expect(updateQuestion(quiz, "tf", (question) => ({ ...question, prompt: "New" })).questions[0].prompt).toBe("New");
    expect(moveItem([1, 2, 3], 0, 5)).toEqual([1, 2, 3]);
    expect(quiz).toEqual(before);
  });

  it("removes a scenario from its questions", () => {
    const { quiz, scenario } = addScenario(makeQuiz());
    const linked = updateQuestion(quiz, "tf", (question) => ({ ...question, scenarioId: scenario.id }));
    const removed = removeScenario(linked, scenario.id);
    expect(removed.scenarios).toBeUndefined();
    expect(removed.questions[0].scenarioId).toBeUndefined();
  });
});

describe("quiz issues", () => {
  it("finds nothing wrong with a valid quiz", () => {
    expect(quizIssues({ ...makeQuiz(), schemaVersion: 2 })).toEqual([]);
  });

  it("places each problem on its question and field, in plain words", () => {
    let quiz = { ...blankQuiz(), title: "T" };
    quiz = updateQuestion(quiz, "q1", () => ({ ...mc(), answer: "" }));
    quiz = addQuestion(quiz, {
      id: "q2",
      type: "matching",
      prompt: "M",
      choices: [
        { id: "a", text: "A" },
        { id: "b", text: "" },
      ],
      items: [
        { id: "1", text: "x", answer: "a" },
        { id: "2", text: "y", answer: "" },
      ],
    });
    quiz = addQuestion(quiz, { id: "q3", type: "numeric", prompt: "N", answer: Number.NaN });
    const issues = quizIssues(quiz);
    expect(issues).toEqual([
      { questionId: "q1", field: "answer", message: "Choose the correct answer." },
      { questionId: "q2", field: "items.1.answer", message: "Item 2 needs a match." },
      { questionId: "q2", field: "choices.1.text", message: "Choice B needs text or an image." },
      { questionId: "q3", field: "answer", message: "The correct answer must be a number." },
    ]);
    expect(describeIssue(quiz, issues[2])).toBe("Question 2: Choice B needs text or an image.");
  });

  it("flags quiz-wide problems such as a shared choice or a missing scenario", () => {
    const quiz: Quiz = {
      schemaVersion: 2,
      id: "x",
      title: "",
      questions: [
        {
          id: "q1",
          type: "matching",
          prompt: "M",
          choices: [
            { id: "a", text: "A" },
            { id: "b", text: "B" },
          ],
          items: [
            { id: "1", text: "x", answer: "a" },
            { id: "2", text: "y", answer: "a" },
          ],
        },
        { id: "q2", type: "true_false", prompt: "T", answer: true, scenarioId: "gone" },
      ],
    };
    expect(quizIssues(quiz).map((issue) => [issue.questionId ?? "", issue.field, issue.message])).toEqual([
      ["", "title", "The title can't be empty."],
      ["q1", "reuseChoices", 'Two items share a choice. Turn on "Let a choice match more than one item", or pick another match.'],
      ["q2", "scenarioId", "This question's scenario no longer exists."],
    ]);
  });

  it("does not ask a new quiz for an id", () => {
    expect(quizIssues({ ...blankQuiz(), title: "T" }).some((issue) => issue.field === "id")).toBe(false);
  });
});

describe("saving checks", () => {
  it("stores every saved quiz as version 2 under its storage id", () => {
    const quiz = prepareSavedQuiz({ ...makeQuiz(), id: "other" }, "stored");
    expect(quiz.schemaVersion).toBe(2);
    expect(quiz.id).toBe("stored");
    expect(() => prepareSavedQuiz({ ...makeQuiz(), title: "" }, "stored")).toThrow();
    expect(() => prepareSavedQuiz("nope", "stored")).toThrow(/isn't a quiz/);
  });

  it("refuses SVG images and reports images that aren't stored", () => {
    const quiz = { ...makeQuiz(), schemaVersion: 2 as const };
    quiz.questions[0].image = { src: "images/a.svg" };
    expect(() => prepareSavedQuiz(quiz, "q")).toThrow(/png, jpg, gif, or webp/);
    quiz.questions[0].image = { src: "images/a.png" };
    expect(missingImage(quiz, () => false)).toBe("images/a.png");
    expect(missingImage(quiz, () => true)).toBeNull();
  });

  it("keeps the folder and import date in the library entry", () => {
    const meta = savedMetadata(
      { id: "x", title: "Old", questionCount: 1, importedAt: "2026-01-01", folderId: "f" },
      { ...makeQuiz(), id: "x", title: "New" },
      "2026-10-29",
    );
    expect(meta).toMatchObject({ title: "New", questionCount: 3, importedAt: "2026-01-01", folderId: "f", updatedAt: "2026-10-29" });
  });
});

describe("attempt snapshots", () => {
  const quiz = { ...makeQuiz(), schemaVersion: 2 as const };

  it("keeps attempts as they are when the questions they asked did not change", () => {
    const attempt = attemptOf(quiz, { questionIds: ["tf"] });
    const edited = updateQuestion(quiz, "single", (question) => ({ ...question, prompt: "Changed" }));
    expect(withQuizSnapshots([attempt], quiz, edited)).toEqual({ attempts: [attempt], changed: false });
  });

  it("copies what an attempt asked before an edit changes it", () => {
    const attempt = attemptOf(quiz, { questionIds: ["single", "tf"] });
    const edited = removeQuestion2(updateQuestion(quiz, "tf", (question) => ({ ...question, prompt: "Changed" })), "single");
    const { attempts: next, changed } = withQuizSnapshots([attempt], quiz, edited);
    expect(changed).toBe(true);
    expect(next[0].snapshot?.questions.map((question) => question.prompt)).toEqual([
      quiz.questions[1].prompt,
      quiz.questions[0].prompt,
    ]);
    expect(attemptQuestions(edited, next[0]).map((question) => question.id)).toEqual(["single", "tf"]);
    expect(quizForAttempt(edited, next[0]).questions).toHaveLength(2);
    // The first copy is the one that matches the attempt; later edits keep it.
    const again = withQuizSnapshots(next, edited, { ...edited, questions: [] });
    expect(again.changed).toBe(false);
  });

  it("leaves other quizzes' attempts alone", () => {
    const other = attemptOf({ ...quiz, id: "other" });
    const edited = updateQuestion(quiz, "tf", (question) => ({ ...question, prompt: "Changed" }));
    expect(withQuizSnapshots([other], quiz, edited).changed).toBe(false);
  });
});

function removeQuestion2(quiz: Quiz, id: string): Quiz {
  return { ...quiz, questions: quiz.questions.filter((question) => question.id !== id) };
}

describe("desktop store", () => {
  it("creates a quiz under an id from its title, as version 2", async () => {
    const meta = await store.createQuiz({ ...makeQuiz(), id: "ignored", title: "Brand New Quiz" }, null);
    expect(meta).toMatchObject({ id: "brand-new-quiz", title: "Brand New Quiz", questionCount: 3, folderId: null });
    const stored = await store.getQuiz("brand-new-quiz");
    expect(stored?.schemaVersion).toBe(2);
    const again = await store.createQuiz({ ...makeQuiz(), title: "Brand New Quiz" }, null);
    expect(again.id).not.toBe("brand-new-quiz");
  });

  it("saves edits and snapshots the attempts they change", async () => {
    const { id } = await store.createQuiz({ ...makeQuiz(), title: "Edit Me" }, null);
    const original = (await store.getQuiz(id))!;
    const saved = await attempts.saveAttempt({
      quizId: id,
      startedAt: "2026-10-01T00:00:00.000Z",
      correct: 1,
      total: 1,
      percent: 100,
      questionIds: ["tf"],
      answers: { tf: false },
    });
    const edited = updateQuestion(original, "tf", (question) => ({ ...question, prompt: "Edited" }));
    const meta = await store.saveQuiz({ ...edited, title: "Edited Title" });
    expect(meta).toMatchObject({ id, title: "Edited Title" });
    expect(meta.updatedAt).toBeTruthy();
    expect((await store.getQuiz(id))?.questions[0].prompt).toBe("Edited");
    const attempt = await attempts.getAttempt(saved.id);
    expect(attempt?.snapshot?.questions[0].prompt).toBe(original.questions[0].prompt);
  });

  it("refuses an invalid quiz, an unknown quiz, and images it doesn't have", async () => {
    const { id } = await store.createQuiz({ ...makeQuiz(), title: "Strict" }, null);
    const quiz = (await store.getQuiz(id))!;
    await expect(store.saveQuiz({ ...quiz, title: "" })).rejects.toThrow("This quiz can't be saved yet. The title can't be empty.");
    await expect(store.saveQuiz({ ...quiz, id: "missing" })).rejects.toThrow(/not found/);
    const withImage = structuredClone(quiz);
    withImage.questions[0].image = { src: "images/none.png" };
    await expect(store.saveQuiz(withImage)).rejects.toThrow(/isn't stored/);
    expect((await store.getQuiz(id))?.title).toBe("Strict");
  });
});
