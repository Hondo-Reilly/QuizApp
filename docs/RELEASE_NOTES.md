# v0.8.0

## New

- **Number answers.** A `numeric` question takes a typed number and marks it correct when it's within the quiz's `tolerance` of the answer. You can type commas (`1,250.5`) or scientific notation (`3e-4`). A question can show a unit after the box, such as mm or °.
- **Money answers.** Give a numeric question a `currency` such as `"USD"`, `"EUR"`, or `"JPY"`, and the box shows the symbol. Answers and the correct value are shown as money, e.g. "$1,339.20 ± $0.01".
- **Matching.** A `matching` question lists concepts on one side and a lettered choice bank (A, B, C…) on the other. You match each concept with a drop-down. By default each choice is used once, and a picked choice leaves the other drop-downs until you clear it. Quizzes can set `reuseChoices` to let one choice match several concepts.
- **Partial credit for matching.** Matching 7 of 10 concepts scores 0.7 of a question, so scores can now be fractional, like "11.5 / 12". A partly right answer gets an amber **Partly correct** badge and a "7 of 10 matched" count.
- Printouts include number blanks and matching blanks beside the lettered bank, and the answer key lists matches like "1–E, 2–I".
- The **Download Example Quiz** file now includes number, money, and matching questions.

## Fixed

- **Undo in code answers.** Cmd+Z now works after Tab, Shift-Tab, and auto-indent in a code answer.
- The quiz right-click menu highlights only one item at a time, whether you use the mouse or the keyboard.

## AI skills

- **quiz-app-maker** can write numeric, money, and matching questions.
- **quiz-attempt-reviewer** reads partial matching credit and typed number answers in attempt exports.
- Both skills record the app version (`metadata.version: 0.8.0`). Download them again from **AI Skills** to update the copies installed in Claude.

## Compatibility

- Numeric and matching questions need `"schemaVersion": 2`. Older versions of QuizApp can't import quizzes that use them.
- Existing quizzes, attempts, and settings keep working. Nothing needs migrating.

## Installation note

QuizApp is currently unsigned. If macOS blocks the downloaded app, follow the [Mac installation instructions](https://github.com/Hondo-Reilly/QuizApp#install).
