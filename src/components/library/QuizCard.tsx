import { useCallback, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { quizApi } from "@/api/quizApi";
import { Button } from "@/components/ui/Button";
import { ContextMenu, type ContextMenuItem } from "@/components/ui/ContextMenu";
import type { UseLibrary } from "@/hooks/useLibrary";
import { duplicateQuiz } from "@/lib/duplicateQuiz";
import { isElectronApp } from "@/lib/runtime";
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
  const library = useOutletContext<UseLibrary>();
  const [dragging, setDragging] = useState(false);
  const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);
  const closeMenu = useCallback(() => setMenuAt(null), []);

  const report = (action: string) => (err: unknown) =>
    alert(`Could not ${action}. ${err instanceof Error ? err.message : ""}`.trim());

  const menuItems: ContextMenuItem[] = [
    { label: "Edit quiz", onSelect: () => navigate(`/quiz/${quiz.id}/edit`) },
    {
      label: "Duplicate and edit",
      onSelect: () =>
        void duplicateQuiz(quiz.id, quiz.folderId)
          .then((copyId) => {
            void library.refresh();
            navigate(`/quiz/${copyId}/edit`);
          })
          .catch(report("duplicate the quiz")),
    },
    ...(isElectronApp()
      ? [
          {
            label: "Show in Finder",
            onSelect: () => void quizApi.revealQuiz(quiz.id).catch(report("show the quiz in Finder")),
          },
        ]
      : []),
    {
      label: "Download quiz",
      onSelect: () => void quizApi.exportQuiz(quiz.id).catch(report("download the quiz")),
    },
  ];

  return (
    <>
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
        onContextMenu={(event) => {
          event.preventDefault();
          setMenuAt({ x: event.clientX, y: event.clientY });
        }}
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
      <ContextMenu
        position={menuAt}
        label={`${quiz.title} actions`}
        items={menuItems}
        onClose={closeMenu}
      />
    </>
  );
}
