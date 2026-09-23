# v0.2.0

## Fixes

- Fixed the blank window in affected installed Mac builds by making packaged UI asset paths relative to the app's HTML file.
- Added a desktop build check that rejects missing or root-absolute asset paths before a DMG is produced.
- Added the first 20 automated tests for quiz validation and grading, session behavior, mobile session state, and setup preferences.

## Installation note for existing Mac users

**A manual reinstall is likely needed if your installed app opens to a blank window.** The blank window prevents the in-app update controls from loading. Quit QuizApp, download the v0.2.0 Apple Silicon DMG, open it, and drag QuizApp into Applications, replacing the existing app. Saved quizzes, attempts, and settings are stored separately from the application bundle and should remain available after replacement. Do not use **Delete All App Data** for this update.

The previously installed v0.1.5 build and some earlier v0.1.6 packages used broken asset paths. The v0.1.4 DMG inspected during diagnosis used working relative paths. The browser build is unaffected by this Mac packaging issue.

QuizApp is currently unsigned; if macOS blocks the newly downloaded app, follow the [Mac installation instructions](https://github.com/Hondo-Reilly/QuizApp#install).
