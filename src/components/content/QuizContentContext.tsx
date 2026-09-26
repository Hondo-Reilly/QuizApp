import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { quizApi } from "@/api/quizApi";
import type { renderMarkdown } from "@/lib/markdown";
import { imageRefs, textFormatOf } from "@shared/quizContent";
import type { Quiz, TextFormat } from "@shared/types";

export type LoadAssetUrls = (
  quizId: string,
  paths: string[],
) => Promise<Record<string, string>>;

interface QuizContent {
  format: TextFormat;
  imageUrl: (src: string) => string | undefined;
  /** Loaded on demand for Markdown quizzes; null until it arrives. */
  render: typeof renderMarkdown | null;
}

const QuizContentContext = createContext<QuizContent>({
  format: "plain",
  imageUrl: () => undefined,
  render: null,
});

// The Markdown and KaTeX code is large, so plain quizzes never load it.
let rendererLoad: Promise<typeof renderMarkdown> | null = null;

function loadRenderer(): Promise<typeof renderMarkdown> {
  rendererLoad ??= import("@/lib/markdown").then((mod) => mod.renderMarkdown);
  return rendererLoad;
}

export function useQuizContent(): QuizContent {
  return useContext(QuizContentContext);
}

const defaultLoader: LoadAssetUrls = (quizId, paths) =>
  quizApi.getQuizAssetUrls(quizId, paths);

/** Gives rich text and images inside it the quiz's text format and image URLs. */
export function QuizContentProvider({
  quiz,
  loadAssetUrls = defaultLoader,
  children,
}: {
  quiz: Quiz;
  loadAssetUrls?: LoadAssetUrls;
  children: ReactNode;
}) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [render, setRender] = useState<typeof renderMarkdown | null>(null);
  const format = textFormatOf(quiz);

  useEffect(() => {
    if (format !== "markdown") return;
    let cancelled = false;
    void loadRenderer().then((loaded) => {
      if (!cancelled) setRender(() => loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [format]);
  const refsKey = useMemo(() => imageRefs(quiz).join("\n"), [quiz]);

  useEffect(() => {
    const paths = refsKey ? refsKey.split("\n") : [];
    if (paths.length === 0) {
      setUrls({});
      return;
    }
    let cancelled = false;
    loadAssetUrls(quiz.id, paths)
      .then((loaded) => {
        if (!cancelled) setUrls(loaded);
      })
      .catch(() => {
        if (!cancelled) setUrls({});
      });
    return () => {
      cancelled = true;
    };
  }, [quiz.id, refsKey, loadAssetUrls]);

  const value = useMemo<QuizContent>(
    () => ({ format, imageUrl: (src) => urls[src], render }),
    [format, urls, render],
  );
  return <QuizContentContext.Provider value={value}>{children}</QuizContentContext.Provider>;
}
