import { useMemo } from "react";
import { useQuizContent } from "./QuizContentContext";

export interface RichTextProps {
  text: string;
  /** Inline text such as a choice: no paragraphs or block elements. */
  inline?: boolean;
  className?: string;
  /** Plain text only: keep the line breaks the author typed. */
  preserveLines?: boolean;
}

/** Quiz text: plain as written, or Markdown with math when the quiz opts in. */
export function RichText({
  text,
  inline = false,
  className = "",
  preserveLines = false,
}: RichTextProps) {
  const { format, imageUrl, render } = useQuizContent();
  // Until the Markdown renderer has loaded, show the text as written.
  const html = useMemo(
    () => (format === "markdown" && render ? render(text, imageUrl, { inline }) : null),
    [format, render, text, imageUrl, inline],
  );

  if (html === null) {
    const Plain = inline ? "span" : "div";
    const plainClass = `${preserveLines ? "whitespace-pre-line " : ""}${className}`.trim();
    return <Plain className={plainClass || undefined}>{text}</Plain>;
  }
  const Rich = inline ? "span" : "div";
  return (
    <Rich
      className={`rich-text ${className}`}
      // Markdown is rendered with raw HTML disabled; see src/lib/markdown.ts.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
