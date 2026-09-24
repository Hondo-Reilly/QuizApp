import { Link, Outlet, useMatch } from "react-router-dom";
import { version } from "../package.json";
import { DownloadAiQuizButton } from "@/components/library/DownloadAiQuizButton";
import { DownloadExampleButton } from "@/components/library/DownloadExampleButton";
import { MobileModeButton } from "@/components/ui/MobileModeButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { UpdateButton } from "@/components/ui/UpdateButton";
import { Breadcrumb } from "@/components/library/Breadcrumb";
import { useLibrary, type UseLibrary } from "@/hooks/useLibrary";
import { DevViewIndicator } from "@/components/dev/DevViewIndicator";
import { isElectronApp } from "@/lib/runtime";
import type { DraggedQuiz } from "@/lib/quizDrag";

export function App() {
  const library = useLibrary();

  const folderMatch = useMatch("/folder/:folderId");
  const takingQuiz = useMatch("/quiz/:id/take");
  const folderId = folderMatch?.params.folderId ?? null;
  const breadcrumbPath = folderId ? library.pathTo(folderId) : [];
  const desktop = isElectronApp();

  return (
    <div className="flex min-h-full flex-col">
      <header
        className={`${desktop ? "titlebar-drag " : ""}sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95`}
      >
        <div
          className={`flex h-11 w-full items-center gap-6 pr-6 ${desktop ? "pl-[5.5rem]" : "pl-6"}`}
        >
          <Link
            to="/"
            className="titlebar-no-drag shrink-0 text-base font-semibold tracking-tight text-slate-900 dark:text-neutral-100"
          >
            QuizApp
          </Link>
          <div className="titlebar-no-drag min-w-0 flex-1">
            {breadcrumbPath.length > 0 && (
              <Breadcrumb
                path={breadcrumbPath}
                onDropQuiz={(quiz: DraggedQuiz, folderId) => {
                  if ((quiz.folderId ?? null) === folderId) return;
                  void library.moveQuiz(quiz.id, folderId);
                }}
              />
            )}
          </div>
          <div className="titlebar-no-drag flex shrink-0 items-center gap-3">
            {desktop && takingQuiz ? (
              <MobileModeButton />
            ) : (
              <>
                <DownloadExampleButton />
                <DownloadAiQuizButton />
              </>
            )}
            {desktop && <UpdateButton />}
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main
        className={`mx-auto w-full max-w-6xl flex-1 px-6 pt-8 ${desktop ? "pb-8" : "pb-14"}`}
      >
        <Outlet context={library satisfies UseLibrary} />
      </main>
      {!desktop && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 bg-slate-50/95 py-2 text-center text-xs text-slate-400 dark:bg-neutral-950/95 dark:text-neutral-500">
          v{version}
        </div>
      )}
      <DevViewIndicator library={library} />
    </div>
  );
}
