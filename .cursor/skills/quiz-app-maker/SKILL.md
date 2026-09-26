---
name: quiz-app-maker
description: Generate quizzes for QuizApp as a JSON file, or as a .quiz package when the quiz has images. Supports Markdown with LaTeX math, code, and tables, images in prompts, choices, and scenarios, and ungraded written, code, and photo answers. Use this skill whenever the user wants to create, write, generate, or build a quiz, test, trivia set, or set of practice questions — including true/false, multiple-choice, select-all-that-apply, short-answer, essay or written-response, coding, photo or show-your-work, and case-study or scenario-based questions — or asks for quiz questions on any topic, or references importing a quiz into QuizApp, a quiz `.json` file, or a `.quiz` package. Trigger even when the user doesn't say the word "quiz" but clearly wants graded questions with answers (e.g. "make me 10 questions to test my team on the new HR policy"). Do NOT use for ungraded discussion questions, flashcards, or surveys with no correct answer, or for reviewing results of a quiz the user already took (use quiz-attempt-reviewer for that).
---

# Quiz App Maker

Turn a topic (or source material) into a valid quiz JSON file that imports cleanly into QuizApp. Getting the JSON schema right is necessary but not sufficient — the harder, more valuable part is writing questions that are actually *good tests of knowledge*. A quiz where the right answer gives itself away teaches nothing and measures nothing. Most of this skill is about avoiding that.

## Before you generate

Ask the user **how many questions** they want if they haven't said. Question count strongly shapes the quiz and users almost always have a number in mind, so a quick "How many questions would you like?" saves a wasted draft. Don't ask about anything else unless the topic is genuinely ambiguous — infer difficulty, type mix, and tone from context and the defaults below.

If the user gave source material (a document, notes, a URL), draw questions from it rather than from general knowledge, so the quiz tests *their* material and stays factually grounded.

## Output contract

**Without images:** output **only** the JSON object — no commentary, no markdown code fence, nothing before or after — so it can be saved directly to a `.json` file. When working with files, save it as `<slug>.json`.

**With images:** the quiz must be a `.quiz` package, a zip holding `quiz.json` and an `images/` folder. See [Images](#images) below.

The full schema lives in `references/quiz-format.md`. Read it before generating so every field and constraint is correct. It matches QuizApp's `docs/QUIZ_FORMAT.md` and `shared/schema.ts`. Complete valid examples: `references/example-quiz.json` (plain, version 1), `references/example-written-quiz.json` (written, code, and photo answers, version 2), and `references/example-rich-quiz.json` (Markdown, math, images, and a scenario, version 2; it is the `quiz.json` of a package, so its image files are not included). Skim the one that fits. The essentials:

- Top level: `schemaVersion`, `title` (required), `questions` (1+). Optional: `id`, `description`, `author`, `tags`, `scenarios`, and in version 2 `textFormat`.
- `schemaVersion` is `1` for plain-text quizzes. Use `2` only when the quiz uses Markdown (`"textFormat": "markdown"`) or images.
- Each question needs a unique `id`, a `type`, and a `prompt`.
- Scenarios (optional) → top-level `scenarios[]` of `{ id, title?, text }`; a question sets `scenarioId` to show that scenario above its prompt. Every `scenarioId` must match a scenario id, and scenario ids must be unique.
- `true_false` → boolean `answer`.
- `multiple_choice` → `choices[]` (2+, unique ids), single `answer` id that matches one choice.
- `multi_answer` → `choices[]` (2+, unique ids), `answers[]` (non-empty, unique choice ids). Graded correct only on an exact-set match.
- Version 2 only: `image` (`{ "src": "images/<file>", "alt": "..." }`) on a question, choice, or scenario. A choice with an image may have `"text": ""`.
- Version 2 only, not auto-graded: `short_answer` and `long_answer` (text, with optional `minLength`/`maxLength`; `"code": true` plus optional `"language"` makes a code answer), and `image_response` (photos, with optional `maxImages`). Give each one a `sampleAnswer` and a `rubric`. See [Written, code, and photo answers](#written-code-and-photo-answers).

## Written, code, and photo answers

QuizApp can't grade these; the user compares their answer with your `sampleAnswer`, optionally marks it themselves, or has an AI review it against your `rubric`. So:

- **Use them where recall or reasoning in the user's own words is the point:** definitions, explanations, "why" questions, derivations, writing code, sketches, diagrams, worked math on paper. Keep choice questions as the backbone. A quiz that is mostly written answers gets no score.
- **Pick the right type:**
  - `short_answer`: one term, number, or phrase. Set a tight `maxLength` (30–150).
  - `long_answer`: an explanation or argument. Set `minLength` only when a real explanation needs length (e.g. 80–200), and a `maxLength` that fits the task (500–3000). Don't set `minLength` so high that padding is rewarded.
  - `long_answer` with `"code": true`: a function, query, or snippet. Add `"language"` (`"python"`, `"javascript"`, `"sql"`, `"java"`, …).
  - `image_response`: work that's naturally done by hand: sketches, labeled diagrams, handwritten derivations, a photo of a physical setup. Say exactly what to draw and photograph. Use `maxImages` above 1 only when several pages are expected.
- **Always write a `sampleAnswer`:** a complete, correct model answer at the length you expect, not a vague hint. For code, working code in the stated language.
- **Always write a `rubric`:** 2–5 short, checkable points that a correct answer must contain, and that distinguish it from common wrong answers. "Explains that axial tilt, not distance, causes seasons" beats "Mentions the key concept".
- **Make the prompt answerable on its own terms:** state what's expected ("in 2–3 sentences", "return a string", "label all three sides"), so the user and a grader agree on what "complete" means.
- `explanation` still works and is shown after submitting. Use it for the *why*, and the `sampleAnswer` for *what a good answer looks like*.

## Rich text: Markdown and math

Markdown is optional. Turn it on (`"schemaVersion": 2, "textFormat": "markdown"`) when the subject benefits from it:

- **Math and science:** formulas, units with exponents, and equations as LaTeX (`$v = \frac{d}{t}$` inline, `$$...$$` on its own line).
- **Programming:** inline `` `code` `` and fenced code blocks with a language.
- **Data:** a small Markdown table the question asks about.
- **Emphasis:** `**bold**` for words a question hinges on, such as **not** or **most**.

For plain recall topics such as history, vocabulary, or policy, stay on version 1 plain text.

Markdown applies to prompts, choice text, explanations, and scenario text. Keep these rules in mind:

- **Escape for JSON.** Every LaTeX backslash is written twice in the file (`"$\\sqrt{2}$"`), and line breaks are `\n`. A code block or table needs `\n` between its lines, and a blank line (`\n\n`) before it.
- **Watch dollar signs.** Prices like `$5 and $10` stay plain text, but a price and inline math in the same field can pair up as a formula (`$5 and $x$`). In a field that has math, write amounts as "5 dollars" or "USD 5".
- **Keep formatting parallel across choices.** If one choice uses math or code formatting, format the others the same way. Otherwise the odd one out is a giveaway, just like a longer option.
- Raw HTML is not rendered, so don't use it.

## Images

Only use images you actually have: files the user gave you, or images you create as real files, for example an SVG diagram you write or a chart drawn with code. Never reference an image you have not put in the package, and never invent file names.

- Put every image in `images/` (subfolders allowed) as `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, or `.svg`. Remote URLs are rejected. Keep each image under 10 MB.
- **SVG is the easiest way to draw your own diagrams**, such as geometry figures, graphs, circuits, flowcharts, and labeled parts. QuizApp converts each SVG to a PNG when the quiz is imported. Make it self-contained: set a `viewBox` (and ideally `width`/`height`), give it a white background `<rect>` so it reads well in dark mode, use common fonts (`Helvetica, Arial, sans-serif`), and keep text at 16px or larger at the SVG's own size. Don't use scripts, `foreignObject`, web fonts, or links to other files; they are removed before rendering.
- Check a diagram the way you check options: labels must not give away the answer, and the figure must match the numbers in the question.
- Reference images with `image` fields, or inside Markdown text as `![alt](images/file.png)` when the quiz uses `"textFormat": "markdown"`.
- **Write alt text that doesn't give away the answer.** Alt text shows if an image fails to load and is read aloud by screen readers. For image choices where recognizing the image *is* the test, use neutral alt text like "Graph A".
- Images must earn their place: the question should need the image (read the graph, identify the part, interpret the diagram), not just decorate it.

To package it, write `quiz.json` next to an `images/` folder, then zip both at the top level of the archive and name it `<slug>.quiz`:

```
cd <slug> && zip -r ../<slug>.quiz quiz.json images
```

If you cannot create files, output the JSON and tell the user which image files to put in `images/` and how to zip them.

## Defaults (when the user doesn't specify)

- **Difficulty: moderate-to-challenging.** Assume the quiz is a real test, not a warm-up. Distractors should be close enough that a person needs to actually know the material to rule them out. If the user asks for easy/beginner or hard/expert, scale accordingly — for easy, wider gaps between right and wrong; for hard, subtle distinctions and common expert-level traps.
- **Type mix: mostly multiple-choice.** Lean on `multiple_choice` as the backbone, with a few `true_false` and the occasional `multi_answer` for variety. Multiple-choice discriminates knowledge best; true/false is a coin-flip if overused; multi-answer is great but harder to write well, so use it sparingly and deliberately.
- **Explanations: always include one.** Every question gets an `explanation`, even though the schema marks it optional. The explanation is where learning happens — it should say *why* the answer is right and, when useful, why a tempting distractor is wrong. Keep it to a sentence or two of real substance, not a restatement of the answer.

## Writing questions that actually test knowledge

This is the core of the skill. A well-formed JSON file full of giveaway questions is a failure. The failure modes below are the ones that quietly wreck quizzes — guard against every one.

### The options must not reveal the answer by their shape

A test-taker who knows nothing should not be able to score above chance by reading the *form* of the options instead of their *content*. That means:

**Match length and detail across all options.** The single most common tell is that the correct answer is longer, more precise, or more qualified than the distractors — because the writer put care into getting it exactly right and threw the wrong ones together. Balance them. If the right answer is "Because rising interest rates increased borrowing costs for firms," the distractors should be comparably specific ("Because consumer confidence fell after the election"), not "Bad economy." When you finish a multiple-choice question, look at the options with the answer key hidden and ask: *could I guess the right one just from length or specificity?* If yes, rewrite.

**Keep grammar and structure parallel.** All options should be the same grammatical form — all noun phrases, all full sentences, all starting the same way. An option that doesn't fit the prompt grammatically screams "I'm a throwaway distractor." Parallel structure forces the test-taker to engage with meaning.

**Make distractors genuinely plausible.** Good wrong answers are the real skill. Reach for common misconceptions, near-misses, right-idea-wrong-detail, or things true in a related context but not this one. A distractor nobody would ever pick is a wasted slot — it effectively turns a 4-option question into a 3-option one. Every distractor should be a trap someone could reasonably fall into.

**Avoid giveaway language.** Absolute words ("always," "never," "all," "none") in an option usually mark it as false and savvy test-takers know it, so don't cluster them only on wrong answers. Likewise don't hedge only the correct answer ("usually," "in most cases") — that pattern flags it. Distribute such language so it carries no signal.

### Position and structure

**Randomize where the correct answer sits.** Don't let the answer default to the same slot. Across a quiz, spread correct answers roughly evenly across positions (a, b, c, d...) so there's no positional pattern to exploit. After drafting, glance at the answer keys as a sequence — if they're all "b" or follow an obvious rhythm, shuffle.

**Write prompts that stand on their own.** The prompt should pose a clear, unambiguous question answerable from knowledge, not from wording tricks. Avoid double negatives and "which of the following is NOT..." unless the negation is essential and clearly emphasized.

**For `multi_answer`, vary how many options are correct.** Since grading requires an exact-set match, don't make it predictable (e.g. always exactly two right). Sometimes two, sometimes three; make each option an independent judgment. Ensure at least one correct and at least one incorrect option so it's a real "select all that apply." Do not repeat a choice id in `answers`.

**For `true_false`, make the statement non-obvious.** A true/false that's trivially true or absurdly false measures nothing. The best ones hinge on a specific fact or a plausible-sounding misconception, so a knowledgeable person and a guesser diverge.

### Scenario-based questions

Use a scenario when the user asks for case studies, reading passages, or applied "what should the inspector/nurse/engineer do" questions, or when source material naturally supplies a situation to reason about. Don't force scenarios onto plain recall quizzes.

- **Put the facts in the scenario, the question in the prompt.** The scenario holds everything the test-taker needs (conditions, measurements, what was observed). Each prompt asks one thing about it and should not repeat the scenario.
- **Make every question depend on the scenario.** A question someone could answer without reading it doesn't belong to it. Good scenario questions require spotting which details matter, e.g. which readings are out of spec.
- **Plant realistic details, including some that are fine.** If every detail is a problem, the task becomes "everything is wrong." Mix compliant and noncompliant details so the reader has to judge each one.
- **Aim for 2–4 questions per scenario** that build on each other: diagnose, then decide, then choose the fix. Keep them adjacent in `questions` and in that order; the app keeps a scenario's questions together when shuffling.
- **Give each scenario a short `title`** such as "Case Study 1: Validating a Fluorescent PT Examination".
- **Explanations should cite the scenario:** name the specific detail that makes the answer right.

### A quick self-check before you output

Run the draft through this lens:

- Hide the answer key. Can you still pick the right answers from length, grammar, or oddly-implausible distractors? If so, rebalance.
- Are the correct answers spread across positions, or clustered?
- Does every distractor represent a mistake a real person could actually make?
- Does every explanation teach something, rather than restate the answer?
- Is the difficulty consistent with what the user asked for (or moderate by default)?
- Do choice ids stay unique, and does every `answer` / `answers` entry point at one of those ids with no duplicates?
- If you used Markdown: is `schemaVersion` 2 with `"textFormat": "markdown"`, is every LaTeX backslash doubled for JSON, and is formatting consistent across a question's choices?
- If you used images: does every `src` point at a file you actually put in `images/`, and does no alt text reveal an answer?
- If you used written, code, or photo answers: does each have a complete `sampleAnswer` and a checkable `rubric`, sensible length limits, and is the quiz still mostly auto-graded?
- If you used scenarios: does every `scenarioId` match a scenario, and does each scenario question actually need the scenario to answer?

## Example transformation

**Weak (answer gives itself away):**

```json
{
  "type": "multiple_choice",
  "prompt": "Why did the Roman Empire's western half decline?",
  "choices": [
    { "id": "a", "text": "It was cold" },
    { "id": "b", "text": "A combination of fiscal strain, overextended borders, political instability, and pressure from migrating groups gradually eroded central authority" },
    { "id": "c", "text": "Bad luck" }
  ],
  "answer": "b"
}
```

The right answer is three times longer and far more specific — anyone can spot it.

**Strong (balanced, plausible distractors):**

```json
{
  "type": "multiple_choice",
  "prompt": "Which factor is most emphasized by historians explaining the Western Roman Empire's decline?",
  "choices": [
    { "id": "a", "text": "A sudden currency collapse that wiped out the treasury in a single decade" },
    { "id": "b", "text": "The gradual erosion of central authority under fiscal, military, and migratory pressures" },
    { "id": "c", "text": "The relocation of the capital to Constantinople abandoning the west overnight" },
    { "id": "d", "text": "A series of plagues that depopulated the western provinces within a generation" }
  ],
  "answer": "b",
  "explanation": "Most historians describe a slow, multi-causal erosion rather than any single sudden event. The distractors each contain a grain of truth (currency debasement, the eastern capital, plagues) but overstate its speed or role."
}
```

All four options are comparable in length and specificity, each is a plausible near-miss, and the explanation teaches why the tempting wrong answers fall short.
