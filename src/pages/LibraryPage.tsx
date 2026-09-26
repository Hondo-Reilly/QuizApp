import { useMemo, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ErrorNotice, LoadingMessage } from "@/components/ui/PageState";
import { Button } from "@/components/ui/Button";
import { ImportButton } from "@/components/library/ImportButton";
import { QuizCard } from "@/components/library/QuizCard";
import { EmptyState } from "@/components/library/EmptyState";
import { FolderCard } from "@/components/library/FolderCard";
import { NewFolderDialog } from "@/components/library/NewFolderDialog";
import { RenameFolderDialog } from "@/components/library/RenameFolderDialog";
import { MoveQuizDialog } from "@/components/library/MoveQuizDialog";
import type { UseLibrary } from "@/hooks/useLibrary";
import type { DraggedQuiz } from "@/lib/quizDrag";
import type { Folder, QuizMetadata } from "@shared/types";

export function LibraryPage() {
  const params = useParams();
  const navigate = useNavigate();
  const currentFolderId = params.folderId ?? null;

  const {
    folders,
    quizzes,
    loading,
    error,
    foldersIn,
    quizzesIn,
    pathTo,
    countsByFolder,
    importQuizzes,
    deleteQuiz,
    moveQuiz,
    createFolder,
    updateFolder,
    deleteFolder,
  } = useOutletContext<UseLibrary>();

  const currentPath = useMemo(
    () => pathTo(currentFolderId),
    [pathTo, currentFolderId],
  );
  const currentFolder = currentPath[currentPath.length - 1] ?? null;
  const childFolders = foldersIn(currentFolderId);
  const childQuizzes = quizzesIn(currentFolderId);

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Folder | null>(null);
  const [moveTarget, setMoveTarget] = useState<QuizMetadata | null>(null);

  const isInvalidFolder =
    currentFolderId !== null && currentFolder === null && !loading;

  const handleDropQuiz = async (quiz: DraggedQuiz, folderId: string | null) => {
    if ((quiz.folderId ?? null) === folderId) return;
    await moveQuiz(quiz.id, folderId);
  };

  const handleDeleteFolder = async (folder: Folder) => {
    const count = countsByFolder.get(folder.id) ?? 0;
    const message =
      count > 0
        ? `Delete "${folder.name}" and ${count} ${count === 1 ? "quiz" : "quizzes"} inside? This cannot be undone.`
        : `Delete "${folder.name}"? This cannot be undone.`;
    if (!confirm(message)) return;
    await deleteFolder(folder.id, true);
  };

  if (isInvalidFolder) {
    return (
      <div>
        <PageHeader
          title="Folder not found"
          subtitle="That folder may have been deleted."
          actions={<Button onClick={() => navigate("/")}>Back to library</Button>}
        />
      </div>
    );
  }

  const title = currentFolder ? currentFolder.name : "Quiz Library";
  const subtitle = currentFolder
    ? currentFolder.description ?? "Folder contents"
    : "Import quizzes and start an attempt.";

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button variant="secondary" onClick={() => setNewFolderOpen(true)}>
        New folder
      </Button>
      <ImportButton onClick={() => importQuizzes(currentFolderId)} />
    </div>
  );

  const libraryIsEmpty = folders.length === 0 && quizzes.length === 0;
  const folderIsEmpty =
    childFolders.length === 0 && childQuizzes.length === 0;

  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} actions={headerActions} />

      {error && <ErrorNotice message={error} />}

      {loading ? (
        <LoadingMessage />
      ) : libraryIsEmpty && currentFolderId === null ? (
        <EmptyState onImport={() => importQuizzes(null)} />
      ) : (
        <div className="flex flex-col gap-8">
          {childFolders.length > 0 && (
            <section>
              <SectionHeader title="Folders" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {childFolders.map((folder) => (
                  <FolderCard
                    key={folder.id}
                    folder={folder}
                    quizCount={countsByFolder.get(folder.id) ?? 0}
                    onRename={setRenameTarget}
                    onDelete={handleDeleteFolder}
                    onDropQuiz={(quiz) => handleDropQuiz(quiz, folder.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {childQuizzes.length > 0 && (
            <section>
              <SectionHeader title="Quizzes" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {childQuizzes.map((quiz) => (
                  <QuizCard
                    key={quiz.id}
                    quiz={quiz}
                    onDelete={deleteQuiz}
                    onMove={setMoveTarget}
                  />
                ))}
              </div>
            </section>
          )}

          {folderIsEmpty && currentFolderId !== null && (
            <p className="text-sm text-slate-500 dark:text-neutral-400">
              This folder is empty.
            </p>
          )}
        </div>
      )}

      <NewFolderDialog
        open={newFolderOpen}
        parentName={currentFolder?.name}
        onClose={() => setNewFolderOpen(false)}
        onCreate={async ({ name, description }) => {
          await createFolder({
            name,
            description,
            parentId: currentFolderId,
          });
        }}
      />

      <RenameFolderDialog
        open={renameTarget !== null}
        folder={renameTarget}
        onClose={() => setRenameTarget(null)}
        onSave={async ({ id, name, description }) => {
          await updateFolder({ id, name, description });
        }}
      />

      <MoveQuizDialog
        open={moveTarget !== null}
        quiz={moveTarget}
        folders={folders}
        onClose={() => setMoveTarget(null)}
        onMove={async (folderId) => {
          if (!moveTarget) return;
          await moveQuiz(moveTarget.id, folderId);
        }}
      />
    </div>
  );
}
