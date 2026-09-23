# QuizApp

An Electron + React + Tailwind desktop app for importing and taking JSON-based quizzes. This is mostly a vibecoded app so I can avoid paying for another subscription so expect some bugs.

## Install

QuizApp is Mac only for now (Apple Silicon). Download the latest build from the [releases page](https://github.com/Hondo-Reilly/QuizApp/releases), open the disk image, and drag QuizApp into Applications.

macOS will then say the app is damaged and can't be opened. The app is fine but is unsigned because I don't want to pay for an Apple Developer account. macOS blocks unsigned apps that were downloaded in a browser.

After QuizApp is in Applications, open Terminal and run:

```bash
xattr -cr /Applications/QuizApp.app
```

That clears the download mark on QuizApp only. Then open the app from Applications. Use the same command again after you install a newer release.

## Features

- Import quizzes from `.json` files into a persistent local library (stored in Electron's `userData` folder)
- Three question types: true/false, multiple choice, and select-all-that-apply (multi-answer)
- Optional shuffled question order per attempt
- Two reveal modes: see the answer after each question, or only at the end
- Review screen with grade and per-question breakdown
- Mobile mode: a phone on the same Wi-Fi can take the current quiz with the Mac

## Mobile mode

On the start screen, turn on **Enable mobile mode**, or use the **Mobile mode** button in the header after the quiz has started. QuizApp shows a QR code for a phone on the same Wi-Fi.

The phone and the Mac stay on the same question. Answers and revealed answers update on both screens. The phone uses the Mac app's light or dark theme. The QR window closes when the phone connects. A green dot on the header button means the server is still running.

Mobile mode stops when you leave the quiz, finish it, or choose **End mobile mode**. Closing the QR window does not stop it. Anyone on the same Wi-Fi who has the address can open the quiz.

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
