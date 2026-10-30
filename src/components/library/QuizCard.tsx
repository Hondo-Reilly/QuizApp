import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { quizApi } from "@/api/quizApi";
import { Button } from "@/components/ui/Button";
import { DeleteIconButton } from "@/components/ui/DeleteIconButton";
import {
  ContextMenu,
  contextMenuPosition,
  type ContextMenuItem,
} from "@/components/ui/ContextMenu";
import { isElectronApp } from "@/lib/runtime";
import { writeQuizDrag } from "@/lib/quizDrag";
import { ShareStatus } from "@/components/share/ShareStatus";
import { deleteQuizPrompt } from "@/lib/shareText";
import { LibraryItemCard } from "./LibraryItemCard";
import type { QuizMetadata } from "@shared/types";

export interface QuizCardProps {
  quiz: QuizMetadata;
  onDelete: (id: string) => void;
  onMove: (quiz: QuizMetadata) => void;
  onShare: (quiz: QuizMetadata) => void;
  onReplace: (quiz: QuizMetadata) => void;
  onUpdate: (quiz: QuizMetadata) => void;
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

export function QuizCard({
  quiz,
  onDelete,
  onMove,
  onShare,
  onReplace,
  onUpdate,
}: QuizCardProps) {
  const navigate = useNavigate();
  const [dragging, setDragging] = useState(false);
  const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);
  const closeMenu = useCallback(() => setMenuAt(null), []);

  const report = (action: string) => (err: unknown) =>
    alert(`Could not ${action}. ${err instanceof Error ? err.message : ""}`.trim());

  const menuItems: ContextMenuItem[] = [
    { label: "Move…", onSelect: () => onMove(quiz) },
    { label: "Share…", onSelect: () => onShare(quiz) },
    ...(quiz.cloudSource?.available && !quiz.cloudSource.gone
      ? [{ label: "Update to newest version", onSelect: () => onUpdate(quiz) }]
      : []),
    { label: "Replace from file…", onSelect: () => onReplace(quiz) },
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
          setMenuAt(contextMenuPosition(event));
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
            <ShareStatus quiz={quiz} />
          </>
        }
        actions={
          <>
            <DeleteIconButton
              label={`Delete "${quiz.title}"`}
              className="mr-auto"
              onClick={() => {
                if (confirm(deleteQuizPrompt(quiz))) onDelete(quiz.id);
              }}
            />
            <Button variant="ghost" size="sm" onClick={() => onShare(quiz)}>
              Share
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
