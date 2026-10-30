# v0.9.0

## New

- **Share a quiz with a code.** Choose **Share** on a quiz to upload it and get an 8-digit code like `4433 2106`. Anyone with the code can import the quiz in the Mac app or the web app. Shared quizzes expire 30 days after you share them or publish an update; **Extend to 90 days** in the share dialog keeps them longer. **Stop sharing** deletes the shared copy.
- **Updates to shared quizzes.** Change a shared quiz with **Replace from file…**, then choose **Publish update** in the share dialog. The code stays the same. People who imported it see **Update available** on the quiz card, and **Update quiz** on the quiz page brings in the new version. QuizApp checks for updates when the library opens and every few hours, and never updates a quiz without asking.
- **Replace from file.** Swap a quiz's questions and images for a new file without losing its attempts, folder or share code.
- **New import dialog.** **Import quiz** opens one dialog where you can drag in a `.json` or `.quiz` file, browse for one, or enter a share code.
- Sharing a quiz you imported from a code shows that original code to pass on, so everyone gets the author's updates. **Share my own copy instead** uploads a separate copy.

## Changed

- **Quiz page buttons.** Save to PDF, Move, Replace from file and Delete are in a **⋯** menu next to **Share**, **Check updates** and **Start quiz**. A line under the title shows the share code or the code the quiz came from.
- **Library cards.** Delete is a trash can that turns red on hover. Move, and a folder's Rename and Delete, are in the right-click menu. The keyboard's menu key or Shift+F10 also opens it.
- Deleting a shared quiz, or a folder that contains one, warns that the shared copy is deleted too.

## Fixed

- Matching answers on the quiz page use the full width instead of wrapping early, without a "Correct match" label on every line.
- A library card dragged and let go away from a folder slides back to the right spot.
- Dropping a file anywhere other than the import dialog no longer replaces the app window.
- Import errors in the web app no longer name the file twice.

## AI skills

- Both skills record the app version (`metadata.version: 0.9.0`). Nothing else changed in them.

## Compatibility

- Sharing needs an internet connection. Everything else works offline as before.
- Existing quizzes, attempts, and settings keep working. Nothing needs migrating.
- The share code and the token that lets you update or stop a share are kept only in the library that shared the quiz. Another Mac or browser can't publish updates for it.

## Installation note

QuizApp is currently unsigned. If macOS blocks the downloaded app, follow the [Mac installation instructions](https://github.com/Hondo-Reilly/QuizApp#install).
