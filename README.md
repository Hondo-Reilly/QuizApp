# QuizApp

An Electron + React + Tailwind desktop app for importing and taking JSON-based quizzes. This is mostly a vibecoded app so I can avoid paying for another subscription so expect some bugs.

## Features

- Import quizzes from `.json` files into a local library of folders
- Three question types: true/false, multiple choice, and select-all-that-apply (multi-answer)
- Optional shuffled question order per attempt
- Two reveal modes: see the answer after each question, or only at the end
- Review screen with grade and per-question breakdown
- Light and dark mode
- Mobile mode on the Mac: a phone on the same Wi-Fi can take the current quiz with the app

## Install

QuizApp is Mac only for now (Apple Silicon). Download the latest build from the [releases page](https://github.com/Hondo-Reilly/QuizApp/releases), open the disk image, and drag QuizApp into Applications.

macOS will then say the app is damaged and can't be opened. The app is fine but is unsigned because I don't want to pay for an Apple Developer account. macOS blocks unsigned apps that were downloaded in a browser.

After QuizApp is in Applications, open Terminal and run:

```bash
xattr -cr /Applications/QuizApp.app
```

That clears the download mark on QuizApp only. Then open the app from Applications. Use the same command again after you install a newer release.

## On the web

The same quiz screens are at [hondo-reilly.github.io/QuizApp](https://hondo-reilly.github.io/QuizApp/).

Quizzes you import stay in that browser. They are not uploaded to a backend server. Folders, full quiz files, attempts, and answers are saved there too. Light and dark mode and your setup choices are remembered in the browser.

Mobile mode and app updates are only in the Mac app. A phone can open the site and take a quiz, but it cannot join a live Mac session. On the web, Save to PDF uses the browser's print dialog.

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

```bash
npm run dev -- --web
```

This starts the browser version only, at `http://localhost:5173/QuizApp/`. `npm run build:web` builds the static site that GitHub Pages publishes.

## Project layout

```
electron/   # main + preload processes (Node)
shared/     # types, Zod schema, grading, shuffle - used by both sides
src/        # React renderer (UI)
types/      # ambient declarations for window.quizApi
docs/       # quiz format spec
sample-quizzes/
```
