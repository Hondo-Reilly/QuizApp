---
name: quiz-attempt-reviewer
description: Review QuizApp quiz results and tell the user what to study. Use this skill whenever the user shares or mentions a QuizApp attempt export (JSON with `questions` holding `selected`, `correct`, and `flagged`, or an `attempts` array, or an `.attempt` file with photo answers), or asks to grade written, code, or photo answers from a quiz, or asks to go over a quiz or test they took, find their weak spots, explain their mistakes, make a study plan, or build a follow-up practice quiz from their results. Trigger even without the word "QuizApp" when the user pastes graded quiz results and wants feedback. Do NOT use for writing a brand-new quiz with no results to review; that is the quiz-app-maker skill's job.
---

# Quiz Attempt Reviewer

Turn a QuizApp attempt export into a clear picture of what the user knows, what they don't, and what to do next. The score is the least interesting part. The value is in finding the *concepts* behind the misses and the shaky right answers, explaining the misunderstanding in each, and pointing the user at the smallest amount of study that fixes the most.

## Read the export first

The format is in `references/attempt-export-format.md`. `references/example-attempt-export.json` is a complete example of choice questions, and `references/example-written-attempt.json` one with written, code, and photo answers and self-marks. Read the format before you analyze anything. The essentials:

- An **`.attempt` file** is a zip: unzip it and read `attempt.json`. Photo answers are under `responses/`, and the quiz's own images under `images/`. Look at them.
- A **single attempt** has a top-level `questions` array. **Several attempts** have an `attempts` array, newest first, each with its own `questions`.
- Every question carries its content (`prompt`, `choices`, `answer`/`answers`, `explanation`, `scenarioId`) plus the results: `selected`, `correct`, and `flagged`.
- `selected` is a choice id, an array of ids, a boolean, or `null` for unanswered. Always translate ids into the choice text. The user never saw "b", they saw "Mars".
- If `textFormat` is `"markdown"`, text contains Markdown and LaTeX. Read it as formatted content, and quote formulas as formulas.
- Images are not in the export. Only `alt` text describes them. If a question depends on an image you can't see, say so rather than guessing what it showed.
- If a question has a `scenarioId`, read the matching entry in `scenarios`. The scenario is often where the mistake happened.

If the user gives you something else, such as a screenshot or a paste of only some fields, work with it, but mention that the JSON export gives a fuller review.

## Grade the written, code, and photo answers

QuizApp doesn't grade `short_answer`, `long_answer`, or `image_response`. You do, and that's often the most useful part of the review.

- **Grade against the `rubric` first, then the `sampleAnswer`.** For each rubric point, decide whether the answer covers it: fully, partly, or not. An answer can be right without matching the sample's wording. Credit correct alternatives, and say why.
- **Give a clear verdict per question:** *Correct*, *Partly correct* (say what's missing), or *Incorrect* (name the misconception). Label it as your assessment, not QuizApp's.
- **Code answers:** trace the code on the prompt's cases and a few edge cases. Point to the exact line that's wrong. Check return types and order of conditions, not just the idea.
- **Photo answers:** describe what you see before judging it: labels, working, diagram. If the photo is unreadable, say so and don't guess.
- **Compare with the user's self-mark.** When `selfMark` is present, agreeing confirms it. Disagreeing is the most valuable feedback you can give:
  - They said "got" but the answer misses a rubric point: this is a blind spot. Explain it gently and specifically.
  - They said "missed" but it's right: tell them, and why.
  - "Unsure": give a firm verdict; that's what they asked for by marking it.
- **Adjust the score for them** when useful: "QuizApp counted 3/4; with your written answers graded, it's about 5/8." Say this is your estimate.

## Sort every question into a study priority

Flags are the user telling you what they're unsure of, so they matter even on correct answers. Sort each question into one of these groups:

| Group | What it means | Priority |
| --- | --- | --- |
| **Wrong and flagged** | They knew they didn't know. | Highest: review the concept directly. |
| **Wrong, not flagged** | They were confident and wrong. This usually means a real misconception. | Highest: these are blind spots, and the most important thing to explain. |
| **Right but flagged** | They got it, but weren't sure: likely a guess or shaky recall. | High: treat as not learned yet. Don't congratulate a guess. |
| **Unanswered** | Skipped or out of time. | Check whether they cluster at the end (timing) or on one topic (avoidance). |
| **Open answer you graded partly correct or incorrect** | Your grading found a gap. | High; confident self-marks that you disagree with rank highest. |
| **Self-marked "not sure"** | The user asked for a verdict. | High: give one, then treat per your verdict. |
| **Right, not flagged** | Solid. | Mention briefly as strengths; don't spend study time here. |

Old attempts saved before flags existed have every question `flagged: false`. When `flaggedCount` is 0, don't read anything into the absence of flags.

## Find the concepts, not just the questions

Listing wrong questions is not a review. Group them:

- **Name the underlying idea.** "Prime numbers" is too broad; "forgetting that larger primes like 11 are prime when scanning a list" is useful. Use the prompt, the correct answer, the `explanation`, the `tags`, and the scenario to name it.
- **Read the wrong choice as evidence.** The distractor a user picked shows *how* they're thinking. Picking "Sydney" for Australia's capital means confusing the largest city with the capital. Explain that pattern, not just the right answer.
- **For `multi_answer`, compare sets.** Say which correct choices they missed and which wrong ones they added. Missing items and adding items are different problems.
- **Connect related misses.** Two questions that fail on the same idea are one study item.
- **With several attempts, look at trends.** Which questions are missed every time? Which were fixed? Which stay flagged? Is the score moving? Match questions by `id`, because order and subsets can differ between attempts.

## What to give the user

Keep it tight and specific. A good review usually has:

1. **Snapshot.** Score, how many flagged, and a one-sentence read of what's going on ("Mostly solid on recall; the misses are all about applying the scenario details").
2. **What to study**, in priority order. For each item: the concept, why it's on the list (which questions, wrong or flagged, and what they chose), the correct idea explained in a few sentences, and one concrete way to practice it.
3. **Misconceptions to unlearn.** For confident-wrong answers, spell out the wrong belief and the right one side by side.
4. **Strengths**, briefly, so they know what they can skip.
5. **Next step.** Offer a follow-up practice quiz on the weak concepts (see below).

Quote question text sparingly, just enough to identify it. Prefer the user's own words and choices over ids. Be encouraging but honest: a flagged correct answer is progress to confirm, not a win to celebrate.

## Follow-up practice quiz

When the user wants practice, write a new quiz aimed at the study list. If the **quiz-app-maker** skill is available, use it and follow its format and question-writing rules. Otherwise, produce QuizApp's quiz JSON, using the shape of the exported questions as a guide: `schemaVersion`, `title`, and `questions` with `id`, `type`, `prompt`, `choices`, `answer`/`answers`, and `explanation`.

- **Test the concept in new ways.** Don't reuse the same questions with small wording changes. That checks memory of the question, not understanding.
- **Weight toward the priorities.** Most questions should cover the wrong and wrong-but-confident concepts. Include some for right-but-flagged concepts to confirm them, and very few for strengths.
- **Target the misconception.** When a user fell for a specific distractor, include a question where that same wrong idea is a tempting option.
- **Keep the original quiz's style.** Match its difficulty, and if the export has `"textFormat": "markdown"`, the follow-up can use Markdown and math too.
- Title it clearly, for example "Practice: Series Circuits (from your review)".

## Don't

- Don't regrade auto-graded questions. The export's `correct` for choice and true/false questions is what QuizApp decided; explain it rather than dispute it. If an answer key looks wrong to you, say so separately and gently. Written, code, and photo answers are yours to grade.
- Don't invent what an image or photo showed.
- Don't pad the review with every correct question. Strengths get a line or two.
- Don't lecture on concepts the user clearly has down.
