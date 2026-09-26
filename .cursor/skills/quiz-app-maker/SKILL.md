---
name: quiz-app-maker
description: Generate quizzes as a single JSON file in QuizApp's schemaVersion-1 format. Use this skill whenever the user wants to create, write, generate, or build a quiz, test, trivia set, or set of practice questions — including true/false, multiple-choice, select-all-that-apply, and case-study or scenario-based questions — or asks for quiz questions on any topic, or references importing a quiz into QuizApp or a quiz `.json` file. Trigger even when the user doesn't say the word "quiz" but clearly wants graded questions with answers (e.g. "make me 10 questions to test my team on the new HR policy"). Do NOT use for ungraded discussion questions, flashcards, or surveys with no correct answer.
---

# Quiz App Maker

Turn a topic (or source material) into a valid quiz JSON file that imports cleanly into QuizApp. Getting the JSON schema right is necessary but not sufficient — the harder, more valuable part is writing questions that are actually *good tests of knowledge*. A quiz where the right answer gives itself away teaches nothing and measures nothing. Most of this skill is about avoiding that.

## Before you generate

Ask the user **how many questions** they want if they haven't said. Question count strongly shapes the quiz and users almost always have a number in mind, so a quick "How many questions would you like?" saves a wasted draft. Don't ask about anything else unless the topic is genuinely ambiguous — infer difficulty, type mix, and tone from context and the defaults below.

If the user gave source material (a document, notes, a URL), draw questions from it rather than from general knowledge, so the quiz tests *their* material and stays factually grounded.

## Output contract

Output **only** the JSON object — no commentary, no markdown code fence, nothing before or after — so it can be saved directly to a `.json` file. When working with files, save it as `<slug>.json`.

The full schema lives in `references/quiz-format.md`. Read it before generating so every field and constraint is correct. It matches QuizApp's `docs/QUIZ_FORMAT.md` and `shared/schema.ts` (`schemaVersion` 1). A complete valid example is in `references/example-quiz.json` — skim it to anchor on the shape. The essentials:

- Top level: `schemaVersion` (always `1`), `title` (required), `questions` (1+). Optional: `id`, `description`, `author`, `tags`, `scenarios`.
- Each question needs a unique `id`, a `type`, and a `prompt`.
- Scenarios (optional) → top-level `scenarios[]` of `{ id, title?, text }`; a question sets `scenarioId` to show that scenario above its prompt. Every `scenarioId` must match a scenario id, and scenario ids must be unique.
- `true_false` → boolean `answer`.
- `multiple_choice` → `choices[]` (2+, unique ids), single `answer` id that matches one choice.
- `multi_answer` → `choices[]` (2+, unique ids), `answers[]` (non-empty, unique choice ids). Graded correct only on an exact-set match.

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
