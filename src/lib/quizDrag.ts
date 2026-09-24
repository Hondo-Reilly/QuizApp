import { useState, type DragEvent } from "react";

const QUIZ_DRAG_TYPE = "application/x-quizapp-quiz";

export interface DraggedQuiz {
  id: string;
  folderId: string | null;
}

export function parseQuizDrag(raw: string): DraggedQuiz | null {
  try {
    const parsed = JSON.parse(raw) as Partial<DraggedQuiz>;
    if (typeof parsed.id !== "string" || parsed.id.length === 0) return null;
    if (parsed.folderId !== null && typeof parsed.folderId !== "string") return null;
    return { id: parsed.id, folderId: parsed.folderId ?? null };
  } catch {
    return null;
  }
}

export function writeQuizDrag(
  data: DataTransfer,
  quiz: DraggedQuiz,
): void {
  data.setData(QUIZ_DRAG_TYPE, JSON.stringify(quiz));
  data.effectAllowed = "move";
}

export function quizDragOffered(data: DataTransfer): boolean {
  return [...data.types].includes(QUIZ_DRAG_TYPE);
}

export function readQuizDrag(data: DataTransfer): DraggedQuiz | null {
  return parseQuizDrag(data.getData(QUIZ_DRAG_TYPE));
}

export function useQuizDrop(onDropQuiz: (quiz: DraggedQuiz) => void): {
  over: boolean;
  dropProps: {
    onDragOver: (event: DragEvent<HTMLElement>) => void;
    onDragLeave: (event: DragEvent<HTMLElement>) => void;
    onDrop: (event: DragEvent<HTMLElement>) => void;
  };
} {
  const [over, setOver] = useState(false);

  const onDragOver = (event: DragEvent<HTMLElement>) => {
    if (!quizDragOffered(event.dataTransfer)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setOver(true);
  };

  const onDragLeave = (event: DragEvent<HTMLElement>) => {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    setOver(false);
  };

  const onDrop = (event: DragEvent<HTMLElement>) => {
    if (!quizDragOffered(event.dataTransfer)) return;
    event.preventDefault();
    event.stopPropagation();
    setOver(false);
    const quiz = readQuizDrag(event.dataTransfer);
    if (quiz) onDropQuiz(quiz);
  };

  return { over, dropProps: { onDragOver, onDragLeave, onDrop } };
}
