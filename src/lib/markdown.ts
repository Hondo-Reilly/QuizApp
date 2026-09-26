import MarkdownIt from "markdown-it";
import katex from "katex";
import texmath from "markdown-it-texmath";
import { isImagePath } from "@shared/quizContent";

export type ResolveImage = (src: string) => string | undefined;

type RenderEnv = { resolveImage?: ResolveImage };

// Raw HTML stays off, so quiz text can never inject markup or scripts.
const md = new MarkdownIt({ html: false, linkify: true, breaks: true });

// texmath inserts KaTeX output with String.replace, which rewrites "$&" and
// "$'" inside it. Render its math tokens here with plain concatenation instead.
const KATEX_OPTIONS = { output: "mathml", throwOnError: false } as const;
const MATH_WRAPPERS: Record<string, [string, string, boolean]> = {
  math_inline: ["<eq>", "</eq>", false],
  math_inline_double: ["<section><eqn>", "</eqn></section>", true],
  math_block: ["<section><eqn>", "</eqn></section>", true],
  math_block_eqno: ["<section><eqn>", "</eqn></section>", true],
};

// MathML output needs no KaTeX fonts or CSS, so it works in the packaged app,
// the browser, the phone page, and printed PDFs alike.
md.use(texmath, {
  engine: katex,
  delimiters: "dollars",
  katexOptions: { ...KATEX_OPTIONS },
});

for (const [name, [open, close, displayMode]] of Object.entries(MATH_WRAPPERS)) {
  md.renderer.rules[name] = (tokens, idx) =>
    open + katex.renderToString(tokens[idx].content, { ...KATEX_OPTIONS, displayMode }) + close;
}

md.renderer.rules.image = (tokens, idx, _options, env) => {
  const token = tokens[idx];
  const src = String(token.attrGet("src") ?? "");
  const alt = md.utils.escapeHtml(token.content);
  const url = isImagePath(src) ? (env as RenderEnv | undefined)?.resolveImage?.(src) : undefined;
  if (!url) return alt ? `<span class="rich-missing-image">[${alt}]</span>` : "";
  return `<img src="${md.utils.escapeHtml(url)}" alt="${alt}" class="rich-image" />`;
};

const defaultLinkOpen =
  md.renderer.rules.link_open ??
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx].attrSet("target", "_blank");
  tokens[idx].attrSet("rel", "noopener noreferrer");
  return defaultLinkOpen(tokens, idx, options, env, self);
};

// Image sources in Markdown are package paths; keep them untouched so they
// can be resolved later, and still refuse javascript: and similar links.
const defaultValidateLink = md.validateLink.bind(md);
md.validateLink = (url) => isImagePath(url) || defaultValidateLink(url);

export function renderMarkdown(
  text: string,
  resolveImage: ResolveImage,
  options: { inline?: boolean } = {},
): string {
  const env = { resolveImage };
  return options.inline ? md.renderInline(text, env) : md.render(text, env);
}
