# v0.3.0

## New

- Scenario questions: a quiz can define shared case studies or passages, and each question can show one above its prompt. Questions that share a scenario stay together when shuffled. Existing quiz files import unchanged.
- The Ai Quiz Skill download and the example quiz now cover scenario questions.
- Settings now include an accent color and **Delete All App Data**, which removes quizzes, attempts, and saved settings after confirmation.

## Fixes

- A failed attempt save now stays on the quiz so it can be retried.
- Desktop library writes run one at a time, and related browser writes share a single transaction.
- Imports that only partly succeed now report which files failed.
- Mobile mode checks answers sent from the phone, and keyboard focus stays inside open dialogs.

## Installation note

QuizApp is currently unsigned. If macOS blocks the downloaded app, follow the [Mac installation instructions](https://github.com/Hondo-Reilly/QuizApp#install).
