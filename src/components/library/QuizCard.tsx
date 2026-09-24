import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { writeQuizDrag } from "@/lib/quizDrag";
import { LibraryItemCard } from "./LibraryItemCard";
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
  const [dragging, setDragging] = useState(false);

  return (
    <LibraryItemCard
      variant="quiz"
      title={quiz.title}
      description={quiz.description}
      draggable
      dragging={dragging}
      onDragStart={(event) => {
        writeQuizDrag(event.dataTransfer, {
          id: quiz.id,
          folderId: quiz.folderId,
        });
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      onOpen={() =>
        navigate(`/quiz/${quiz.id}`, { state: { folderId: quiz.folderId } })
      }
      metadata={
        <>
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
        </>
      }
      actions={
        <>
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
        </>
      }
    />
  );
}
