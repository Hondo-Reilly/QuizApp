import { useCallback, useEffect, useMemo, useState } from "react";
import { useBlocker, useLocation, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { quizApi } from "@/api/quizApi";
import { QuizContentProvider } from "@/components/content/QuizContentContext";
import { AddQuestionDialog } from "@/components/editor/AddQuestionDialog";
import { DetailsForm } from "@/components/editor/DetailsForm";
import { RedoIcon, UndoIcon } from "@/components/editor/EditorFields";
import { EditorOutline } from "@/components/editor/EditorOutline";
import { EditorPreview } from "@/components/editor/EditorPreview";
import { QuestionForm } from "@/components/editor/QuestionForm";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ErrorNotice, LoadingMessage, PageErrorState } from "@/components/ui/PageState";
import type { UseLibrary } from "@/hooks/useLibrary";
import { forgetQuiz, rememberQuiz } from "@/lib/quizPageCache";
import { isElectronApp } from "@/lib/runtime";
import { markdownPreview } from "@/lib/markdownPreview";
import { pickImage } from "@/lib/editorImages";
import { imageRefs } from "@shared/quizContent";
import { DETAILS, loadEditorAssetUrls, useEditorStore } from "@/state/editorStore";
import { useSessionStore, type SessionConfig } from "@/state/sessionStore";
import {
  addQuestion,
  blankQuestion,
  blankQuiz,
  duplicateQuestion,
  moveQuestion,
  removeQuestion,
  uniqueId,
  updateQuestion,
} from "@shared/quizEdits";
import { quizIssues, type QuizIssue } from "@shared/quizIssues";
import type { Question, QuestionType, Quiz, QuizImage } from "@shared/types";

function isTextTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/** Practice runs show each answer right away, in quiz order, with every question. */
const PRACTICE_CONFIG: SessionConfig = {
  shuffleQuestions: false,
  shuffleChoices: false,
  revealMode: "after_each",
  questionCount: 0,
  timeLimitMinutes: null,
  selfMark: true,
};

/** What the Library's New quiz passes to the editor. */
export interface NewQuizState {
  /** The quiz to start from: the example or pasted JSON. Blank when missing. */
  start?: Quiz;
  folderId?: string | null;
}

export function QuizEditorPage() {
  // A new quiz has no id until its first save stores it.
  const { id = "" } = useParams();
  const isNew = id === "";
  const navigate = useNavigate();
  const location = useLocation();
  const newQuiz = (location.state as NewQuizState | null) ?? {};
  const library = useOutletContext<UseLibrary>();
  const {
    draft,
    dirty,
    past,
    future,
    selected,
    pending,
    saveAttempted,
    attemptSave,
    setKeepOnLeave,
    load,
    apply,
    undo,
    redo,
    select,
    markSaved,
    addPending,
    clearPending,
    reset,
  } = useEditorStore();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  // Phones show the form or the preview, one at a time.
  const [phoneView, setPhoneView] = useState<"edit" | "preview">("edit");

  useEffect(() => {
    let active = true;
    setLoadError(null);
    const kept = useEditorStore.getState();
    if (kept.keepOnLeave && kept.draft && kept.draft.id === id) {
      // Back from a practice run: carry on with the same draft and history. The
      // flag clears after this settles, since React may run this effect twice
      // and the cleanup between the runs must not reset the draft.
      window.setTimeout(() => useEditorStore.getState().setKeepOnLeave(false), 0);
    } else if (isNew) {
      const start = newQuiz.start;
      // Starting from the example or pasted JSON counts as unsaved; a blank quiz doesn't.
      load({ ...(start ?? blankQuiz()), id: "", schemaVersion: 2 }, start ? blankQuiz() : undefined);
    } else {
      quizApi
        .getQuiz(id)
        .then((quiz) => {
          if (!active) return;
          if (!quiz) setLoadError("Quiz not found.");
          // The editor always saves version 2, so it loads as version 2 to start unchanged.
          else load({ ...quiz, schemaVersion: 2 });
        })
        .catch((err: unknown) => active && setLoadError(err instanceof Error ? err.message : String(err)));
    }
    return () => {
      active = false;
      if (!useEditorStore.getState().keepOnLeave) reset();
    };
  }, [id, load, reset]);

  // Issues show once Save has been tried, then update live until a save succeeds.
  const issues = useMemo(() => (draft && saveAttempted ? quizIssues(draft) : []), [draft, saveAttempted]);

  // A new loader whenever images are added, so the preview picks them up;
  // it reads them from the store, so `pending` is only the signal to reload.
  const loadAssetUrls = useCallback(
    (quizId: string, paths: string[]) => loadEditorAssetUrls(quizId, paths),
    [pending],
  );

  const addImage = useCallback(async (): Promise<QuizImage | null> => {
    try {
      const upload = await pickImage();
      if (!upload) return null;
      addPending(upload);
      return { src: upload.path };
    } catch (err) {
      setSaveError(`Could not add that image. ${err instanceof Error ? err.message : ""}`.trim());
      return null;
    }
  }, [addPending]);
  const index = draft ? draft.questions.findIndex((question) => question.id === selected) : -1;
  const question = index >= 0 ? draft!.questions[index] : null;

  const save = useCallback(async () => {
    const current = useEditorStore.getState().draft;
    if (!current || saving) return;
    // The first try reveals any issues; the header counts them and the first one opens.
    attemptSave();
    const blocking = quizIssues(current);
    if (blocking.length > 0) {
      select(blocking[0].questionId ?? DETAILS);
      setSaveError(null);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const { pending: added } = useEditorStore.getState();
      const used = new Set(imageRefs(current));
      const uploads = Object.entries(added)
        .filter(([path]) => used.has(path))
        .map(([path, { data }]) => ({ path, data }));
      if (!current.id) {
        // A new quiz is stored for the first time, then edited at its own address.
        const meta = await quizApi.createQuiz(current, newQuiz.folderId ?? null, uploads);
        load({ ...current, id: meta.id });
        void library.refresh();
        navigate(`/quiz/${meta.id}/edit`, { replace: true });
        return;
      }
      await quizApi.saveQuiz(current, uploads);
      markSaved(current);
      clearPending(uploads.map((upload) => upload.path));
      // Cached attempts may have gained snapshots, so the quiz's cache starts over.
      forgetQuiz(current.id);
      rememberQuiz(current);
      void library.refresh();
    } catch (err) {
      setSaveError(`Could not save. ${err instanceof Error ? err.message : ""}`.trim());
    } finally {
      setSaving(false);
    }
  }, [saving, select, attemptSave, load, markSaved, clearPending, library, navigate, newQuiz.folderId]);

  // Cmd/Ctrl+S saves anywhere. Undo and redo are left to text fields while one has focus.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      if (document.querySelector("[aria-modal='true']")) return;
      const key = event.key.toLowerCase();
      if (key === "s") {
        event.preventDefault();
        void save();
      } else if (key === "z" && !isTextTarget(event.target)) {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (key === "y" && !isTextTarget(event.target)) {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [save, undo, redo]);

  // In a browser, closing the tab with unsaved changes asks first. Electron would
  // silently keep the window open instead, so the Mac app relies on the in-app prompt.
  useEffect(() => {
    if (!dirty || isElectronApp()) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // Read the store, not this render: a first save moves to the new quiz's address straight away.
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    const state = useEditorStore.getState();
    return state.dirty && !state.keepOnLeave && currentLocation.pathname !== nextLocation.pathname;
  });

  const changeQuestion = useCallback(
    (questionId: string) => (change: (question: Question) => Question, key?: string) =>
      apply((quiz) => updateQuestion(quiz, questionId, change), key ? `${questionId}:${key}` : undefined),
    [apply],
  );

  const addOfType = (type: QuestionType) => {
    if (!draft) return;
    const created = blankQuestion(type, draft.questions.map((item) => item.id));
    apply((quiz) => addQuestion(quiz, created));
    select(created.id);
    setAdding(false);
  };

  const showIssue = (issue: QuizIssue) => select(issue.questionId ?? DETAILS);

  const duplicateById = (questionId: string) => {
    if (!draft) return;
    const copyId = uniqueId("q", draft.questions.map((item) => item.id));
    apply((quiz) => duplicateQuestion(quiz, questionId));
    select(copyId);
  };

  // Deleting the open question opens its neighbor; deleting another keeps the selection.
  const deleteById = (questionId: string) => {
    if (!draft) return;
    const at = draft.questions.findIndex((item) => item.id === questionId);
    if (at === -1) return;
    apply((quiz) => removeQuestion(quiz, questionId));
    if (selected === questionId) {
      const next = draft.questions[at + 1] ?? draft.questions[at - 1];
      select(next?.id ?? DETAILS);
    }
  };

  if (loadError) {
    return <PageErrorState message={loadError} backLabel="Back to Library" onBack={() => navigate("/")} />;
  }
  if (!draft) return <LoadingMessage />;

  const status = saving
    ? "Saving…"
    : dirty
      ? issues.length > 0
        ? `${issues.length} ${issues.length === 1 ? "issue" : "issues"} to fix before saving`
        : "Unsaved changes"
      : isNew
        ? "New quiz"
        : "All changes saved";
  // A practice run of the quiz as it is now, saved or not, starting at the open question.
  const tryIt = () => {
    const current = useEditorStore.getState().draft;
    if (!current) return;
    const blocking = quizIssues(current);
    if (blocking.length > 0) {
      attemptSave();
      select(blocking[0].questionId ?? DETAILS);
      return;
    }
    const routeId = current.id || "practice";
    const session = useSessionStore.getState();
    session.start({ ...current, id: routeId }, PRACTICE_CONFIG, {
      returnTo: location.pathname,
      returnState: location.state,
    });
    if (index >= 0) session.goTo(index);
    setKeepOnLeave(true);
    navigate(`/quiz/${routeId}/take`);
  };

  const back = () => {
    if (!isNew) navigate(`/quiz/${id}`);
    else navigate(newQuiz.folderId ? `/folder/${newQuiz.folderId}` : "/");
  };
  const markdown = draft.textFormat === "markdown";
  const scenario = question?.scenarioId
    ? draft.scenarios?.find((item) => item.id === question.scenarioId)
    : undefined;

  return (
    <QuizContentProvider quiz={draft} loadAssetUrls={loadAssetUrls}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={back}
            className="text-sm text-brand-600 hover:underline dark:text-brand-300"
          >
            {isNew ? "← Back to library" : "← Back to quiz"}
          </button>
          <div className="flex min-w-0 flex-1 basis-60 items-baseline gap-3">
            <h1 className="truncate text-xl font-semibold text-slate-900 dark:text-neutral-100">
              {draft.title.trim() || "Untitled quiz"}
            </h1>
            <span
              role="status"
              className={`shrink-0 text-sm ${
                dirty && issues.length > 0
                  ? "text-red-700 dark:text-red-400"
                  : dirty
                    ? "text-slate-600 dark:text-neutral-400"
                    : isNew
                    ? "text-slate-600 dark:text-neutral-400"
                    : "text-green-700 dark:text-green-400"
              }`}
            >
              {status}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="w-[34px] !px-0"
              onClick={undo}
              disabled={past.length === 0}
              aria-label="Undo"
              title="Undo (⌘Z)"
            >
              <UndoIcon />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="w-[34px] !px-0"
              onClick={redo}
              disabled={future.length === 0}
              aria-label="Redo"
              title="Redo (⇧⌘Z)"
            >
              <RedoIcon />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              title="Take the quiz as it is now, from this question. Nothing is saved."
              onClick={tryIt}
            >
              Try it
            </Button>
            <Button size="sm" onClick={() => void save()} disabled={saving || !dirty} title="Save (⌘S)">
              Save
            </Button>
          </div>
        </div>
        {saveError && <ErrorNotice message={saveError} />}

        {/* Phones swap the question list for a menu, and the form and preview for tabs. */}
        <div className="flex flex-col gap-2 sm:hidden">
          <label htmlFor="editor-question-switcher" className="sr-only">
            Question
          </label>
          <select
            id="editor-question-switcher"
            value={selected}
            onChange={(event) => select(event.target.value)}
            className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          >
            <option value={DETAILS}>Quiz details</option>
            {draft.questions.map((item, position) => {
              const text = (markdown ? markdownPreview(item.prompt) : item.prompt).trim() || "Untitled question";
              return (
                <option key={item.id} value={item.id}>
                  {position + 1}. {text.length > 48 ? `${text.slice(0, 47)}…` : text}
                </option>
              );
            })}
          </select>
          {question && (
            <div role="tablist" aria-label="View" className="flex border-b border-slate-200 dark:border-neutral-800">
              {(["edit", "preview"] as const).map((view) => (
                <button
                  key={view}
                  type="button"
                  role="tab"
                  aria-selected={phoneView === view}
                  onClick={() => setPhoneView(view)}
                  className={`min-h-11 flex-1 text-sm font-medium capitalize ${
                    phoneView === view
                      ? "text-brand-700 shadow-[inset_0_-2px_0] shadow-brand-500 dark:text-brand-300"
                      : "text-slate-600 dark:text-neutral-400"
                  }`}
                >
                  {view}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-start gap-5 pb-24 sm:pb-0">
          <div className="hidden w-full flex-col sm:flex lg:sticky lg:top-16 lg:w-72">
            <aside className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto">
              <EditorOutline
                quiz={draft}
                issues={issues}
                selected={selected}
                onSelect={select}
                onMove={(from, to) => apply((quiz) => moveQuestion(quiz, from, to))}
                onAdd={() => setAdding(true)}
                onDuplicate={duplicateById}
                onDelete={deleteById}
              />
            </aside>
          </div>

          <section
            className={`${question && phoneView === "preview" ? "hidden sm:block" : ""} min-w-0 flex-[999_1_32rem] rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900`}
          >
            {question ? (
              <QuestionForm
                key={question.id}
                question={question}
                index={index}
                total={draft.questions.length}
                scenarios={draft.scenarios ?? []}
                issues={issues.filter((issue) => issue.questionId === question.id)}
                markdown={draft.textFormat === "markdown"}
                onAddImage={addImage}
                onChange={changeQuestion(question.id)}
                onMove={(to) => apply((quiz) => moveQuestion(quiz, index, to))}
                onDuplicate={() => duplicateById(question.id)}
                onDelete={() => deleteById(question.id)}
              />
            ) : (
              <DetailsForm
                quiz={draft}
                issues={issues}
                onChange={(change: (quiz: Quiz) => Quiz, key?: string) => apply(change, key ? `details:${key}` : undefined)}
                onShowIssue={showIssue}
                onAddImage={addImage}
                onOpenQuestion={select}
              />
            )}
          </section>

          {question && (
            <aside
              className={`${phoneView === "edit" ? "hidden sm:block" : ""} min-w-0 flex-[1_1_20rem] lg:sticky lg:top-16 lg:max-w-md`}
            >
              <EditorPreview question={question} scenario={scenario} />
            </aside>
          )}
        </div>
      </div>

      {/* Phones move between questions from a bar pinned to the bottom edge. */}
      <div className="page-gutter fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-slate-200 bg-white/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95 sm:hidden">
        <Button
          variant="secondary"
          className="min-h-11 flex-1"
          disabled={index <= 0 && !question}
          onClick={() => select(index <= 0 ? DETAILS : draft.questions[index - 1].id)}
        >
          Previous
        </Button>
        <Button variant="secondary" className="min-h-11 flex-1" onClick={() => setAdding(true)}>
          + Question
        </Button>
        <Button
          variant="secondary"
          className="min-h-11 flex-1"
          disabled={index === draft.questions.length - 1}
          onClick={() => select(draft.questions[index + 1].id)}
        >
          Next
        </Button>
      </div>

      <AddQuestionDialog
        open={adding}
        onAdd={addOfType}
        onClose={() => setAdding(false)}
      />

      <Modal
        open={blocker.state === "blocked"}
        title="Leave without saving?"
        onClose={() => blocker.reset?.()}
        footer={
          <>
            <Button variant="secondary" onClick={() => blocker.reset?.()}>
              Keep editing
            </Button>
            <Button variant="danger" onClick={() => blocker.proceed?.()}>
              Discard changes
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-700 dark:text-neutral-300">
          Your changes to this quiz haven&apos;t been saved and will be lost.
        </p>
      </Modal>
    </QuizContentProvider>
  );
}
