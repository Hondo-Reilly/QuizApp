import { quizApi } from "@/api/quizApi";
import { currentTheme, withTheme } from "@/lib/theme";
import { useMobileStore } from "@/state/mobileStore";
import { useSessionStore } from "@/state/sessionStore";
import {
  sameAnswer,
  type MobilePatch,
  type MobileSession,
  type MobileSessionSeed,
} from "@shared/mobile";
import type { UserAnswer } from "@shared/types";

let applying = false;
let arming = false;
let gate: Promise<void> = Promise.resolve();
let chain: Promise<void> = Promise.resolve();
let onRemoteFinish = () => {};

interface SessionSlice {
  currentIndex: number;
  answers: Record<string, UserAnswer>;
  submitted: Record<string, boolean>;
}

export function setRemoteFinishHandler(handler: () => void): void {
  onRemoteFinish = handler;
}

export function installMobileSync(): () => void {
  const unsubscribeStore = useSessionStore.subscribe((state, prev) => {
    if (applying) return;
    publish(diff(prev, state));
  });
  const unsubscribeIpc = quizApi.onMobileSnapshot((snapshot) => {
    applySnapshot(snapshot);
  });
  return () => {
    unsubscribeStore();
    unsubscribeIpc();
    void stopMobileSession();
  };
}

export async function startMobileSession(): Promise<string> {
  const seed = seedFromStore();
  if (!seed) throw new Error("Start a quiz before using mobile mode.");
  arming = true;
  let openGate = () => {};
  gate = new Promise<void>((resolve) => {
    openGate = resolve;
  });
  try {
    const url = withTheme(await quizApi.startMobile(seed), seed.theme);
    openGate();
    useMobileStore.getState().markStarted(url);
    return url;
  } catch (error) {
    openGate();
    throw error;
  } finally {
    arming = false;
  }
}

export function sendMobilePatch(
  patch: MobilePatch,
): Promise<MobileSession | null> {
  const run = chain.then(async () => {
    await gate;
    if (!useMobileStore.getState().active && !arming) return null;
    return quizApi.patchMobile(patch);
  });
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function stopMobileSession(): Promise<void> {
  arming = false;
  gate = Promise.resolve();
  useMobileStore.getState().markStopped();
  await quizApi.stopMobile();
}

function publish(patches: MobilePatch[]): void {
  if (patches.length === 0) return;
  if (!useMobileStore.getState().active && !arming) return;
  for (const patch of patches) void sendMobilePatch(patch).catch(() => undefined);
}

function applySnapshot(snapshot: MobileSession): void {
  const quiz = useSessionStore.getState().quiz;
  if (!quiz || quiz.id !== snapshot.quiz.id) return;
  applyMobileSession(snapshot);
  if (snapshot.finished) onRemoteFinish();
}

export function applyMobileSession(snapshot: {
  currentIndex: number;
  answers: MobileSession["answers"];
  submitted: MobileSession["submitted"];
}): void {
  applying = true;
  useSessionStore.getState().applyRemote(snapshot);
  applying = false;
}

function seedFromStore(): MobileSessionSeed | null {
  const state = useSessionStore.getState();
  if (!state.quiz) return null;
  return {
    quiz: state.quiz,
    revealMode: state.config.revealMode,
    order: state.order,
    choicesOrder: state.choicesOrder,
    currentIndex: state.currentIndex,
    answers: state.answers,
    submitted: state.submitted,
    theme: currentTheme(),
  };
}

function diff(prev: SessionSlice, next: SessionSlice): MobilePatch[] {
  const patches: MobilePatch[] = [];
  if (next.currentIndex !== prev.currentIndex) {
    patches.push({ type: "index", currentIndex: next.currentIndex });
  }
  const answerIds = new Set([
    ...Object.keys(prev.answers),
    ...Object.keys(next.answers),
  ]);
  for (const questionId of answerIds) {
    if (!sameAnswer(prev.answers[questionId], next.answers[questionId])) {
      patches.push({
        type: "answer",
        questionId,
        answer: next.answers[questionId] ?? null,
      });
    }
  }
  const submittedIds = new Set([
    ...Object.keys(prev.submitted),
    ...Object.keys(next.submitted),
  ]);
  for (const questionId of submittedIds) {
    if (!prev.submitted[questionId] && next.submitted[questionId]) {
      patches.push({ type: "submit", questionId });
    }
  }
  return patches;
}
