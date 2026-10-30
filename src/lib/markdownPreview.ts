/** A short plain-text version of Markdown for previews such as the sidebar. */
export function markdownPreview(text: string): string {
  // An escaped \$ is a plain dollar sign, not the edge of an equation.
  const ESCAPED_DOLLAR = "\u0000";
  return text
    .replace(/\\\$/g, ESCAPED_DOLLAR)
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\$\$?([^$]*)\$\$?/g, "$1")
    .replace(/[*_`~#>|]/g, "")
    .replace(/\s+/g, " ")
    .split(ESCAPED_DOLLAR)
    .join("$")
    .trim();
}
