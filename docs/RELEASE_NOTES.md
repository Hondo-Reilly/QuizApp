# v0.4.0

## New

- Rich text: quizzes can opt into Markdown with bold and italic, lists, code blocks, tables, links, and LaTeX math. Quizzes that don't opt in look exactly as before.
- Images: questions, choices, and scenarios can show images, including image-only answer choices. Click an image to see it full size.
- .quiz packages: a quiz with images is a single `.quiz` file (a zip of `quiz.json` and an `images/` folder). Import accepts `.quiz` and `.json` files.
- SVG diagrams in a `.quiz` package are converted to sharp PNG images when the quiz is imported.
- Images and math also appear in phone mode, on the review screen, and in Save to PDF.
- A launch screen shows while your library loads, and the Mac window no longer flashes empty on launch.
- The Ai Quiz Skill download now explains Markdown, math, images, SVG diagrams, and how to package a `.quiz` file.

## Compatibility

- Quizzes that use Markdown or images use `"schemaVersion": 2`. QuizApp v0.3.0 and earlier reject these quizzes with an error, so anyone you share them with needs v0.4.0.
- All existing quizzes, attempts, and settings keep working without changes.

## Installation note

QuizApp is currently unsigned. If macOS blocks the downloaded app, follow the [Mac installation instructions](https://github.com/Hondo-Reilly/QuizApp#install).
