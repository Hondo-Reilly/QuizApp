import { beforeEach, describe, expect, it, vi } from "vitest";
import { DETAILS, useEditorStore } from "@/state/editorStore";
import { removeQuestion, updateQuestion } from "@shared/quizEdits";
import type { Quiz } from "@shared/types";
import { makeQuiz } from "./fixtures/quiz";

const store = () => useEditorStore.getState();
const quiz = (): Quiz => ({ ...makeQuiz(), schemaVersion: 2 });
const retitle = (title: string) => (q: Quiz) => ({ ...q, title });

let now = 0;

beforeEach(() => {
  now = 1_000_000;
  vi.spyOn(Date, "now").mockImplementation(() => now);
  store().load(quiz());
});

describe("editor store", () => {
  it("loads unchanged with the first question selected", () => {
    expect(store().dirty).toBe(false);
    expect(store().selected).toBe("tf");
    store().load({ ...quiz(), questions: [] });
    expect(store().selected).toBe(DETAILS);
  });

  it("counts typing in one field as one step to undo", () => {
    store().apply(retitle("A"), "title");
    now += 300;
    store().apply(retitle("AB"), "title");
    now += 300;
    store().apply(retitle("ABC"), "title");
    expect(store().past).toHaveLength(1);
    store().undo();
    expect(store().draft?.title).toBe(quiz().title);
    expect(store().dirty).toBe(false);
    store().redo();
    expect(store().draft?.title).toBe("ABC");
  });

  it("starts a new step after a pause or in another field", () => {
    store().apply(retitle("A"), "title");
    now += 5000;
    store().apply(retitle("AB"), "title");
    store().apply((q) => ({ ...q, author: "Me" }), "author");
    store().apply((q) => ({ ...q, author: "Me" })); // keyless edits always get their own step
    expect(store().past).toHaveLength(4);
  });

  it("is not dirty once an edit is reverted by hand", () => {
    store().apply(retitle("Changed"), "title");
    expect(store().dirty).toBe(true);
    store().apply(retitle(quiz().title), "title");
    expect(store().dirty).toBe(false);
  });

  it("clears redo after a new edit", () => {
    store().apply(retitle("A"));
    store().undo();
    expect(store().future).toHaveLength(1);
    store().apply(retitle("B"));
    expect(store().future).toHaveLength(0);
  });

  it("moves the selection off a question that undo removes", () => {
    store().apply((q) => removeQuestion(q, "multi"));
    store().select("single");
    store().apply((q) => updateQuestion(q, "single", (question) => ({ ...question, prompt: "x" })));
    store().undo();
    store().undo();
    expect(store().selected).toBe("single");
    store().select("multi");
    store().redo(); // removes "multi" again
    expect(store().selected).toBe(DETAILS);
  });

  it("is clean after saving, and dirty again on the next edit", () => {
    store().apply(retitle("Saved"));
    store().markSaved(store().draft!);
    expect(store().dirty).toBe(false);
    store().apply(retitle("After"));
    expect(store().dirty).toBe(true);
  });
});
