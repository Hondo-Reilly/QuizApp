import { useEffect } from "react";
import { Link, Outlet, useMatch } from "react-router-dom";
import { version } from "../package.json";
import { AiSkillsMenu } from "@/components/library/AiSkillsMenu";
import { DownloadExampleButton } from "@/components/library/DownloadExampleButton";
import { MobileModeButton } from "@/components/ui/MobileModeButton";
import { SettingsButton } from "@/components/ui/SettingsButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { UpdateButton } from "@/components/ui/UpdateButton";
import { Breadcrumb } from "@/components/library/Breadcrumb";
import { useLibrary, type UseLibrary } from "@/hooks/useLibrary";
import { DevViewIndicator } from "@/components/dev/DevViewIndicator";
import { isElectronApp } from "@/lib/runtime";
import { hideSplash } from "@/lib/splash";
import type { DraggedQuiz } from "@/lib/quizDrag";

export function App() {
  const library = useLibrary();

  // The splash stays up until the library's first load settles, loaded or failed.
  useEffect(() => {
    if (!library.loading) hideSplash();
  }, [library.loading]);

  const folderMatch = useMatch("/folder/:folderId");
  const takingQuiz = useMatch("/quiz/:id/take");
  const folderId = folderMatch?.params.folderId ?? null;
  const breadcrumbPath = folderId ? library.pathTo(folderId) : [];
  const desktop = isElectronApp();
  const breadcrumb = (singleLine: boolean) =>
    breadcrumbPath.length > 0 ? (
      <Breadcrumb
        path={breadcrumbPath}
        singleLine={singleLine}
        onDropQuiz={(quiz: DraggedQuiz, folderId) => {
          if ((quiz.folderId ?? null) === folderId) return;
          void library.moveQuiz(quiz.id, folderId);
        }}
      />
    ) : null;

  return (
    <div className="flex min-h-full flex-col">
      <header
        className={`${desktop ? "titlebar-drag " : ""}sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95`}
      >
        <div
          className={`flex h-11 w-full items-center gap-3 sm:gap-6 ${desktop ? "pl-[5.5rem] pr-6" : "page-gutter"}`}
        >
          <Link
            to="/"
            className="titlebar-no-drag shrink-0 text-base font-semibold tracking-tight text-slate-900 dark:text-neutral-100"
          >
            QuizApp
          </Link>
          <div className="titlebar-no-drag hidden min-w-0 flex-1 sm:block">
            {breadcrumb(false)}
          </div>
          <div className="titlebar-no-drag ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            {desktop && takingQuiz ? (
              <MobileModeButton />
            ) : (
              <div className="hidden items-center gap-3 sm:flex">
                <DownloadExampleButton />
                <AiSkillsMenu />
              </div>
            )}
            {desktop && <UpdateButton />}
            <ThemeToggle />
            <SettingsButton />
            {!desktop && (
              <div className="sm:hidden">
                <AiSkillsMenu compact version={version} />
              </div>
            )}
          </div>
        </div>
        {/* Phones show the folder path on its own row under the header. */}
        {breadcrumbPath.length > 0 && (
          <div className="page-gutter border-t border-slate-200 py-1.5 dark:border-neutral-800 sm:hidden">
            {breadcrumb(true)}
          </div>
        )}
      </header>
      <main
        className={`page-gutter mx-auto w-full max-w-6xl flex-1 pt-5 sm:pt-8 ${desktop ? "pb-8" : "pb-8 sm:pb-14"}`}
      >
        <Outlet context={library satisfies UseLibrary} />
      </main>
      {!desktop && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 hidden bg-slate-50/95 py-2 text-center text-xs text-slate-400 dark:bg-neutral-950/95 dark:text-neutral-500 sm:block">
          v{version}
        </div>
      )}
      <DevViewIndicator library={library} />
    </div>
  );
}
