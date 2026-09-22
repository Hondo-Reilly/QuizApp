# QuizApp

An Electron + React + Tailwind desktop app for importing and taking JSON-based quizzes.

## Features

- Import quizzes from `.json` files into a persistent local library (stored in Electron's `userData` folder)
- Three question types: true/false, multiple choice, and select-all-that-apply (multi-answer)
- Optional shuffled question order per attempt
- Two reveal modes: see the answer after each question, or only at the end
- Review screen with grade and per-question breakdown

## Quiz JSON format

See [`docs/QUIZ_FORMAT.md`](docs/QUIZ_FORMAT.md) for the full schema and an AI-ready authoring prompt. A working example lives in [`sample-quizzes/example.quiz.json`](sample-quizzes/example.quiz.json).

## Development

```bash
npm install
npm run dev
```

This starts Vite + Electron in development mode with hot reload for the renderer.

## Project layout

```
electron/   # main + preload processes (Node)
shared/     # types, Zod schema, grading, shuffle - used by both sides
src/        # React renderer (UI)
types/      # ambient declarations for window.quizApi
docs/       # quiz format spec
sample-quizzes/
```
