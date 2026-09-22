import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { QuizMetadata } from "@shared/types";

export interface QuizCardProps {
  quiz: QuizMetadata;
  onDelete: (id: string) => void;
  onMove: (quiz: QuizMetadata) => void;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function QuizCard({ quiz, onDelete, onMove }: QuizCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() =>
          navigate(`/quiz/${quiz.id}`, { state: { folderId: quiz.folderId } })
        }
        className="flex flex-1 flex-col text-left"
      >
        <h3 className="text-lg font-semibold text-slate-900 dark:text-neutral-100">
          {quiz.title}
        </h3>
        {quiz.description && (
          <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-neutral-400">
            {quiz.description}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-neutral-400">
          <span>
            {quiz.questionCount}{" "}
            {quiz.questionCount === 1 ? "question" : "questions"}
          </span>
          <span>·</span>
          <span>Imported {formatDate(quiz.importedAt)}</span>
          {quiz.author && (
            <>
              <span>·</span>
              <span>by {quiz.author}</span>
            </>
          )}
        </div>
      </button>
      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => onMove(quiz)}>
          Move
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (confirm(`Delete "${quiz.title}"?`)) onDelete(quiz.id);
          }}
        >
          Delete
        </Button>
        <Button size="sm" onClick={() => navigate(`/quiz/${quiz.id}/setup`)}>
          Start
        </Button>
      </div>
    </Card>
  );
}
