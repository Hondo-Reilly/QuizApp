# Component reuse review

Reviewed: 2026-09-22. This is a static inventory of the current `src/` worktree, including the in-progress timer component. It documents opportunities to reuse code while preserving the current UI. No component code was changed for this review.

## How reuse was counted

I counted exported React components in `src/components/**/*.tsx`, then counted JSX references to each imported component across `src/**/*.tsx`. **Consumer files** are distinct files that render a component. **JSX sites** are places where the tag appears in source. A tag inside `.map()` counts as one source site even though it can render many cards at runtime. These counts describe source reuse, not runtime render frequency.

| Area | Exported components | Used by 2+ files | Used by 1 file | Unused |
| --- | ---: | ---: | ---: | ---: |
| Library | 12 | 2 | 10 | 0 |
| Quiz | 12 | 7 | 5 | 0 |
| Review | 2 | 0 | 2 | 0 |
| UI primitives and controls | 17 | 8 | 8 | 1 |
| **Total** | **43** | **17** | **25** | **1** |

There are **128 direct JSX sites** across **28 consumer files**. Of the 42 used components, 17 (about 40%) have more than one consumer file. That ratio understates platform reuse: all six pages in [`src/pages/`](src/pages/) serve both Electron and the web build through the shared UI, even when a component has only one source consumer. The phone UI separately shares six quiz components with [`TakeQuizPage`](src/pages/TakeQuizPage.tsx): `QuestionCard`, `ProgressBar`, `QuizTimer`, `AnswerFeedback`, `AfterEachNav`, and `AtEndNav`.

## Component inventory

Counts below are **consumer files / JSX sites**.

### Library

| Component | Use | Main consumer(s) |
| --- | ---: | --- |
| [`AttemptList`](src/components/library/AttemptList.tsx) | 1 / 1 | Quiz browse |
| [`Breadcrumb`](src/components/library/Breadcrumb.tsx) | 1 / 1 | App shell |
| [`DownloadAiQuizButton`](src/components/library/DownloadAiQuizButton.tsx) | 1 / 1 | App shell |
| [`DownloadExampleButton`](src/components/library/DownloadExampleButton.tsx) | 1 / 1 | App shell |
| [`EmptyState`](src/components/library/EmptyState.tsx) | 1 / 1 | Library |
| [`FolderCard`](src/components/library/FolderCard.tsx) | 1 / 1 | Library; rendered for each folder |
| [`FolderTreePicker`](src/components/library/FolderTreePicker.tsx) | 1 / 1 | Move dialog |
| [`ImportButton`](src/components/library/ImportButton.tsx) | 2 / 2 | Library and empty state |
| [`MoveQuizDialog`](src/components/library/MoveQuizDialog.tsx) | 2 / 2 | Library and quiz browse |
| [`NewFolderDialog`](src/components/library/NewFolderDialog.tsx) | 1 / 1 | Library |
| [`QuizCard`](src/components/library/QuizCard.tsx) | 1 / 1 | Library; rendered for each quiz |
| [`RenameFolderDialog`](src/components/library/RenameFolderDialog.tsx) | 1 / 1 | Library |

### Quiz

| Component | Use | Main consumer(s) |
| --- | ---: | --- |
| [`AfterEachNav`](src/components/quiz/AfterEachNav.tsx) | 2 / 2 | Desktop/web taking and phone |
| [`AnswerFeedback`](src/components/quiz/AnswerFeedback.tsx) | 2 / 2 | Desktop/web taking and phone |
| [`AtEndNav`](src/components/quiz/AtEndNav.tsx) | 2 / 2 | Desktop/web taking and phone |
| [`MultiAnswerInput`](src/components/quiz/MultiAnswerInput.tsx) | 1 / 1 | QuestionCard |
| [`MultipleChoiceInput`](src/components/quiz/MultipleChoiceInput.tsx) | 1 / 1 | QuestionCard |
| [`PrintQuizDialog`](src/components/quiz/PrintQuizDialog.tsx) | 1 / 1 | Quiz browse |
| [`ProgressBar`](src/components/quiz/ProgressBar.tsx) | 2 / 2 | Desktop/web taking and phone |
| [`QuestionAnswerList`](src/components/quiz/QuestionAnswerList.tsx) | 2 / 2 | Quiz browse and saved attempt |
| [`QuestionCard`](src/components/quiz/QuestionCard.tsx) | 2 / 2 | Desktop/web taking and phone |
| [`QuestionSidebar`](src/components/quiz/QuestionSidebar.tsx) | 1 / 1 | Desktop/web taking |
| [`QuizTimer`](src/components/quiz/QuizTimer.tsx) | 2 / 2 | Desktop/web taking and phone |
| [`TrueFalseInput`](src/components/quiz/TrueFalseInput.tsx) | 1 / 1 | QuestionCard |

### Review

| Component | Use | Main consumer(s) |
| --- | ---: | --- |
| [`ReviewItem`](src/components/review/ReviewItem.tsx) | 1 / 1 | Review; rendered for each question |
| [`ScoreSummary`](src/components/review/ScoreSummary.tsx) | 1 / 1 | Review |

### UI primitives and controls

| Component | Use | Notes |
| --- | ---: | --- |
| [`Button`](src/components/ui/Button.tsx) | **19 / 48** | Most reused primitive |
| [`Card`](src/components/ui/Card.tsx) | **8 / 8** | Shared surface styling |
| [`Checkbox`](src/components/ui/Checkbox.tsx) | **0 / 0** | Exported but unused |
| [`HomeButton`](src/components/ui/HomeButton.tsx) | 1 / 1 | App shell control |
| [`MobileModeButton`](src/components/ui/MobileModeButton.tsx) | 1 / 1 | Electron app shell control |
| [`Modal`](src/components/ui/Modal.tsx) | **6 / 6** | All six dialogs use it |
| [`NumberField`](src/components/ui/NumberField.tsx) | 1 / 2 | Question count and time limit in setup |
| [`PageHeader`](src/components/ui/PageHeader.tsx) | **5 / 6** | Shared page heading layout |
| [`RadioGroup`](src/components/ui/RadioGroup.tsx) | 1 / 1 | Setup reveal mode |
| [`ReleaseNotes`](src/components/ui/ReleaseNotes.tsx) | 1 / 1 | Update dialog |
| [`FieldLabel`](src/components/ui/TextField.tsx) | 2 / 4 | New and rename folder dialogs |
| [`TextArea`](src/components/ui/TextField.tsx) | 2 / 2 | New and rename folder dialogs |
| [`TextInput`](src/components/ui/TextField.tsx) | 4 / 4 | Folder, mobile, and update dialogs |
| [`ThemeToggle`](src/components/ui/ThemeToggle.tsx) | 1 / 1 | App shell control |
| [`Toggle`](src/components/ui/Toggle.tsx) | 2 / 6 | Setup and print dialogs |
| [`UpdateButton`](src/components/ui/UpdateButton.tsx) | 1 / 1 | Electron app shell control |
| [`UpdateDialog`](src/components/ui/UpdateDialog.tsx) | 1 / 1 | Update button |

## Where more reuse would help

| Priority | Opportunity | Safe boundary | UI risk |
| --- | --- | --- | --- |
| 1 | Share folder form fields between [`NewFolderDialog`](src/components/library/NewFolderDialog.tsx#L70) and [`RenameFolderDialog`](src/components/library/RenameFolderDialog.tsx#L77). Both repeat name/description controls, lengths, trimming, error display, and submit state. | Extract a presentational `FolderFields` component and, if useful, a small validation helper. Keep separate dialog titles, footer labels, callbacks, and initial/reset behavior. | Low if existing markup/classes stay identical. |
| 2 | Share the repeated loading and error presentation in [`LibraryPage`](src/pages/LibraryPage.tsx#L96), [`QuizBrowsePage`](src/pages/QuizBrowsePage.tsx#L60), [`QuizSetupPage`](src/pages/QuizSetupPage.tsx#L128), and [`QuizAttemptPage`](src/pages/QuizAttemptPage.tsx#L94). | Add `LoadingMessage` and `ErrorNotice` primitives for the identical styled blocks. Leave each page's navigation and fetching logic in place. | Low; preserve spacing and text. |
| 3 | Share answer status and explanation presentation between [`ReviewItem`](src/components/review/ReviewItem.tsx#L51) and [`QuestionAnswerList`](src/components/quiz/QuestionAnswerList.tsx#L123). | Extract the small status badge and explanation panel. Keep the full question layouts separate because one summarizes answers and the other lists choices. | Low to medium; verify review and saved-attempt screenshots. |
| 4 | Centralize attempt date formatting repeated in [`AttemptList`](src/components/library/AttemptList.tsx#L17) and [`QuizAttemptPage`](src/pages/QuizAttemptPage.tsx#L28). | Use one pure formatter; keep the shorter imported-date format used by `QuizCard` as a separate option. | Low; verify locale output. |
| 5 | Reduce duplicated derived quiz state in [`TakeQuizPage`](src/pages/TakeQuizPage.tsx#L72) and [`MobileQuiz`](src/mobile/MobileQuiz.tsx#L79): current question, answer, submitted state, answered count, first/last checks. | Share a pure selector over quiz/session data. Keep desktop store actions and phone HTTP/SSE actions separate, and keep their layouts separate. | Medium; check answer reveal, navigation, finish, and timer on both. |

The first three are component reuse opportunities. The date formatter and quiz selector are shared logic that would make components simpler and keep behavior aligned.

## Reuse that is already appropriate

- The six core question controls shared by the desktop/web taking page and phone are the strongest example of reuse. They already preserve the same answer appearance while each surface keeps its own layout and transport.
- `Button`, `Card`, `Modal`, `PageHeader`, and text fields provide useful consistency. Their call counts are healthy; no larger design-system rewrite is needed for the current app.
- `FolderCard`, `QuizCard`, and `ReviewItem` each have one source consumer because they render inside a list. They still create many runtime instances and encapsulate real behavior.
- App shell controls such as `ThemeToggle`, `HomeButton`, and `UpdateButton` are naturally single-placement components. A one-file count is not evidence of a problem.
- Keep `AfterEachNav` and `AtEndNav` separate. Their reveal-mode behavior differs, and merging them would add branching to a simple UI. Keep `ReviewItem` and `QuestionAnswerList` as separate full components for the same reason.
- [`Checkbox`](src/components/ui/Checkbox.tsx) is unused. Remove it if it has no planned consumer. Using it for `AttemptList` solely to raise reuse would require ref and indeterminate support and would add complexity without changing the UI.

## How to make a reuse change safely

1. Capture the affected screens in light and dark mode on the web and Electron builds before refactoring. Include empty, loading, error, quiz taking, review, and dialogs as applicable.
2. Extract one presentational piece at a time with the same DOM structure, class names, labels, and props. Avoid changing data flow and visuals in the same change.
3. Check keyboard focus and disabled states for dialog and form extractions. Verify both `npm run build` and `npm run build:web`.
4. For the quiz selector, exercise both reveal modes, true/false, single choice, multi-answer, the phone sync flow, and timer expiry. This is the only recommended extraction with meaningful behavior risk.

The existing uncommitted timer and setup changes were not altered during this review.
