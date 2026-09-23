import { Link, Outlet, useMatch } from "react-router-dom";
import { DownloadAiQuizButton } from "@/components/library/DownloadAiQuizButton";
import { DownloadExampleButton } from "@/components/library/DownloadExampleButton";
import { MobileModeButton } from "@/components/ui/MobileModeButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { UpdateButton } from "@/components/ui/UpdateButton";
import { Breadcrumb } from "@/components/library/Breadcrumb";
import { useLibrary, type UseLibrary } from "@/hooks/useLibrary";

export function App() {
  const library = useLibrary();

  const folderMatch = useMatch("/folder/:folderId");
  const takingQuiz = useMatch("/quiz/:id/take");
  const folderId = folderMatch?.params.folderId ?? null;
  const breadcrumbPath = folderId ? library.pathTo(folderId) : [];

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-6">
          <Link
            to="/"
            className="shrink-0 text-base font-semibold tracking-tight text-slate-900 dark:text-neutral-100"
          >
            QuizApp
          </Link>
          <div className="min-w-0 flex-1">
            {breadcrumbPath.length > 0 && (
              <Breadcrumb path={breadcrumbPath} />
            )}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {takingQuiz ? (
              <MobileModeButton />
            ) : (
              <>
                <DownloadExampleButton />
                <DownloadAiQuizButton />
              </>
            )}
            <UpdateButton />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <Outlet context={library satisfies UseLibrary} />
      </main>
    </div>
  );
}
