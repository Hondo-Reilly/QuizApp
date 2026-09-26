/** A short plain-text version of Markdown for previews such as the sidebar. */
export function markdownPreview(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\$\$?([^$]*)\$\$?/g, "$1")
    .replace(/[*_`~#>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
