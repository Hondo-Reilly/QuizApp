# Component reuse review

Updated: 2026-09-23 against commit `ab64121` and the current `src/` worktree. This review asks whether the same layout or interface element is implemented in multiple views. The goal is one clear source for shared structure, spacing, states, and behavior on both web and Electron. All listed P1 and P2 component items are implemented.

## Review standard

- When two or more views use the same general structure or visual element, put that structure in a reusable component. Pass the title, text, actions, state, or content as props or children.
- Keep page-specific navigation, data fetching, and save behavior in the views. A shared component should make the layout easier to recognize and change in one place.
- Do not equate a one-file consumer with waste. A `QuizCard` used once in source renders for every quiz. The important question is whether another view hand-copies its layout or presentation.
- Preserve existing DOM, classes, responsive widths, dark-mode colors, focus behavior, and platform behavior during extraction. Intentional differences can be explicit variants; unrelated layouts should not be forced into one component.

## Repeated patterns to consolidate

| Priority | Pattern and evidence | Reusable component boundary | Consistency benefit and UI risk |
| --- | --- | --- | --- |
| **P1 · Complete** | Four detail views repeated a centered frame, back control, and title/subtitle; Browse had its own heading markup. | [`DetailPageLayout`](src/components/ui/DetailPageLayout.tsx) now composes `BackLink` and `PageHeader` for Browse, Setup, Attempt, and Review. It keeps each view's width and supports Browse's roomier header spacing. | Shared detail-page structure, with route actions and body content still owned by each view. |
| **P1 · Complete** | Library, Browse, and Attempt repeated uppercase section headings, sometimes with action buttons. | [`SectionHeader`](src/components/ui/SectionHeader.tsx) now owns the heading and optional action row in all five placements. | One place controls section title and action alignment. |
| **P1 · Complete** | Library, Browse, Setup, and Attempt repeated loading and red error presentation; the three detail error screens also repeated a back button. | [`PageState`](src/components/ui/PageState.tsx) now provides `LoadingMessage`, `ErrorNotice`, and a composed `PageErrorState`. | Shared page-state markup and styling; messages and back destinations stay page-specific. |
| **P2 · Complete** | New and rename folder dialogs repeated name/description fields, error text, and Cancel/confirm actions. | [`FolderFields`](src/components/library/FolderFields.tsx) now owns the fields and error presentation; [`DialogActions`](src/components/ui/DialogActions.tsx) owns the footer buttons. Each dialog retains its own initial values, labels, validation, and submit callback. | One source for folder form layout and button states. |
| **P2 · Complete** | Desktop/web taking and phone repeated the progress-plus-timer row. | [`QuizProgressHeader`](src/components/quiz/QuizProgressHeader.tsx) now composes `ProgressBar` and `QuizTimer` on both surfaces, with platform-specific expiry callbacks. | One status layout across quiz surfaces. |
| **P2 · Complete** | Review and saved-answer views repeated a question card header, result pill, and explanation panel. | [`QuestionResultCard`](src/components/quiz/QuestionResultCard.tsx) and `ResultBadge` now share that markup. Callers supply their existing `h2`/`h3` headings and distinct answer content. | One result presentation while preserving heading semantics. |
| **P2 · Complete** | Folder and quiz cards repeated a clickable card body, title/description, metadata area, and action row. | [`LibraryItemCard`](src/components/library/LibraryItemCard.tsx) now owns that structure with folder/quiz variants and content/action slots. | One card layout while preserving each card's navigation and actions. |

The targeted component patterns are now shared. The remaining opportunities below concern date formatting and derived quiz state, which are shared logic rather than layout components.

## Views to review

1. **Library and a folder:** section headings above folder/quiz grids; New folder and Import actions; empty, loading, and error presentation.
2. **Quiz detail:** title and description spacing, Back control, Previous attempts heading, and Questions action row at wide and narrow widths.
3. **Quiz setup:** Back control, title/subtitle, settings card, and loading/error states.
4. **Saved attempt:** Back control, title/subtitle, Questions heading with Export attempt action, and loading/error states.
5. **Review:** Back control, title/subtitle, Retake and Back to library actions, score summary, and question list.

Check those views in light and dark mode on web and Electron. The source layout is shared by both builds.

For the P2 changes, also review New folder and Rename folder dialogs; folder and quiz cards; the progress bar and timer while taking a quiz on desktop/web and phone; and question status/explanations in Quiz detail, Saved attempt, and Review. Check both answer-reveal modes and a quiz without a timer.

## Current reuse snapshot

I counted exported React components in `src/components/**/*.tsx`, then counted JSX references to each imported component across `src/**/*.tsx`. **Consumer files** are distinct files that render a component. **JSX sites** are places where the tag appears in source. A tag inside `.map()` counts as one source site even though it can render many cards at runtime. These counts describe source reuse, not runtime render frequency or a quality score.

| Area | Exported components | Used by 2+ files | Used by 1 file | Unused |
| --- | ---: | ---: | ---: | ---: |
| Development | 1 | 0 | 1 | 0 |
| Library | 14 | 4 | 10 | 0 |
| Quiz | 15 | 8 | 7 | 0 |
| Review | 2 | 0 | 2 | 0 |
| UI primitives and controls | 23 | 12 | 10 | 1 |
| **Total** | **55** | **24** | **30** | **1** |

There are **144 direct JSX sites** across **35 consumer files**. Of the 54 used components, 24 (about 44%) have more than one consumer file. This is context for the layout audit, not a target to raise. `BackLink` has one source consumer, `DetailPageLayout`, but that layout renders it on four views. `ProgressBar` and `QuizTimer` likewise have one source consumer, `QuizProgressHeader`, which renders on desktop/web and phone. All six pages in [`src/pages/`](src/pages/) serve both Electron and the web build. The phone UI shares the question controls, feedback, navigation, and progress layout with [`TakeQuizPage`](src/pages/TakeQuizPage.tsx).

## Component inventory (supporting detail)

Counts below are **consumer files / JSX sites**.

### Development

| Component | Use | Main consumer(s) |
| --- | ---: | --- |
| [`DevViewIndicator`](src/components/dev/DevViewIndicator.tsx) | 1 / 1 | App shell in development mode |

### Library

| Component | Use | Main consumer(s) |
| --- | ---: | --- |
| [`AttemptList`](src/components/library/AttemptList.tsx) | 1 / 1 | Quiz browse |
| [`Breadcrumb`](src/components/library/Breadcrumb.tsx) | 1 / 1 | App shell |
| [`DownloadAiQuizButton`](src/components/library/DownloadAiQuizButton.tsx) | 1 / 1 | App shell |
| [`DownloadExampleButton`](src/components/library/DownloadExampleButton.tsx) | 1 / 1 | App shell |
| [`EmptyState`](src/components/library/EmptyState.tsx) | 1 / 1 | Library |
| [`FolderCard`](src/components/library/FolderCard.tsx) | 1 / 1 | Library; rendered for each folder |
| [`FolderFields`](src/components/library/FolderFields.tsx) | 2 / 2 | New and rename folder dialogs |
| [`FolderTreePicker`](src/components/library/FolderTreePicker.tsx) | 1 / 1 | Move dialog |
| [`ImportButton`](src/components/library/ImportButton.tsx) | 2 / 2 | Library and empty state |
| [`LibraryItemCard`](src/components/library/LibraryItemCard.tsx) | 2 / 2 | Folder and quiz card layout |
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
| [`ProgressBar`](src/components/quiz/ProgressBar.tsx) | 1 / 1 | Through QuizProgressHeader on desktop/web and phone |
| [`QuestionAnswerList`](src/components/quiz/QuestionAnswerList.tsx) | 2 / 2 | Quiz browse and saved attempt |
| [`QuestionCard`](src/components/quiz/QuestionCard.tsx) | 2 / 2 | Desktop/web taking and phone |
| [`QuestionResultCard`](src/components/quiz/QuestionResultCard.tsx) | 2 / 2 | Review and answer list card layout |
| [`QuestionSidebar`](src/components/quiz/QuestionSidebar.tsx) | 1 / 1 | Desktop/web taking |
| [`QuizProgressHeader`](src/components/quiz/QuizProgressHeader.tsx) | 2 / 2 | Desktop/web taking and phone |
| [`QuizTimer`](src/components/quiz/QuizTimer.tsx) | 1 / 1 | Through QuizProgressHeader on desktop/web and phone |
| [`ResultBadge`](src/components/quiz/QuestionResultCard.tsx) | 2 / 2 | Review and answer list status |
| [`TrueFalseInput`](src/components/quiz/TrueFalseInput.tsx) | 1 / 1 | QuestionCard |

### Review

| Component | Use | Main consumer(s) |
| --- | ---: | --- |
| [`ReviewItem`](src/components/review/ReviewItem.tsx) | 1 / 1 | Review; rendered for each question |
| [`ScoreSummary`](src/components/review/ScoreSummary.tsx) | 1 / 1 | Review |

### UI primitives and controls

| Component | Use | Notes |
| --- | ---: | --- |
| [`BackLink`](src/components/ui/BackLink.tsx) | 1 / 1 | Used through DetailPageLayout on four views |
| [`Button`](src/components/ui/Button.tsx) | **19 / 43** | Most reused primitive |
| [`Card`](src/components/ui/Card.tsx) | **6 / 6** | Shared surface styling |
| [`Checkbox`](src/components/ui/Checkbox.tsx) | **0 / 0** | Exported but unused |
| [`DetailPageLayout`](src/components/ui/DetailPageLayout.tsx) | **4 / 4** | Browse, setup, attempt, and review frames |
| [`DialogActions`](src/components/ui/DialogActions.tsx) | 2 / 2 | New and rename folder dialog footers |
| [`ErrorNotice`](src/components/ui/PageState.tsx) | 2 / 2 | Library and PageErrorState |
| [`LoadingMessage`](src/components/ui/PageState.tsx) | **4 / 4** | Library, browse, setup, and attempt |
| [`MobileModeButton`](src/components/ui/MobileModeButton.tsx) | 1 / 1 | Electron app shell control |
| [`Modal`](src/components/ui/Modal.tsx) | **6 / 6** | All six dialogs use it |
| [`NumberField`](src/components/ui/NumberField.tsx) | 1 / 2 | Question count and time limit in setup |
| [`PageErrorState`](src/components/ui/PageState.tsx) | **3 / 3** | Browse, setup, and attempt errors |
| [`PageHeader`](src/components/ui/PageHeader.tsx) | **3 / 4** | Library, taking, and DetailPageLayout |
| [`RadioGroup`](src/components/ui/RadioGroup.tsx) | 1 / 1 | Setup reveal mode |
| [`ReleaseNotes`](src/components/ui/ReleaseNotes.tsx) | 1 / 1 | Update dialog |
| [`SectionHeader`](src/components/ui/SectionHeader.tsx) | **3 / 5** | Library, browse, and attempt section headings |
| [`FieldLabel`](src/components/ui/TextField.tsx) | 1 / 2 | FolderFields |
| [`TextArea`](src/components/ui/TextField.tsx) | 1 / 1 | FolderFields |
| [`TextInput`](src/components/ui/TextField.tsx) | 3 / 3 | FolderFields, mobile, and update dialogs |
| [`ThemeToggle`](src/components/ui/ThemeToggle.tsx) | 1 / 1 | App shell control |
| [`Toggle`](src/components/ui/Toggle.tsx) | 2 / 6 | Setup and print dialogs |
| [`UpdateButton`](src/components/ui/UpdateButton.tsx) | 1 / 1 | Electron app shell control |
| [`UpdateDialog`](src/components/ui/UpdateDialog.tsx) | 1 / 1 | Update button |

## Shared patterns already working

- `Button`, `Card`, and `Modal` give multiple views the same basic controls, surfaces, and dialogs. `PageHeader` and `BackLink` are composed by `DetailPageLayout`, so the four detail pages now share their header structure too.
- The quiz-taking page and phone share `QuestionCard`, `QuizProgressHeader`, `AnswerFeedback`, `AfterEachNav`, and `AtEndNav`. `QuizProgressHeader` composes `ProgressBar` and `QuizTimer` for both. They keep their own page frame and transport.
- `FolderCard`, `QuizCard`, and `ReviewItem` are meaningful components even with one source consumer: each is rendered repeatedly from a list and owns a recognizable visual unit.
- Keep `AfterEachNav` and `AtEndNav` separate because they present different reveal-mode controls. `ReviewItem` and `QuestionAnswerList` can remain separate view components that compose the same `QuestionResultCard` layout.
- [`Checkbox`](src/components/ui/Checkbox.tsx) is unused. Remove it if there is no planned use; adding it to a screen merely to raise its reuse count would not improve consistency.

## Supporting logic to share

- [`AttemptList`](src/components/library/AttemptList.tsx#L17) and [`QuizAttemptPage`](src/pages/QuizAttemptPage.tsx#L35) format attempt dates separately. A common formatter would keep labels consistent; the imported-date style on `QuizCard` can remain an explicit option.
- [`TakeQuizPage`](src/pages/TakeQuizPage.tsx#L72) and [`MobileQuiz`](src/mobile/MobileQuiz.tsx#L79) derive the current question, answer, submitted state, answered count, and first/last state in parallel. A pure selector would reduce drift without combining the two page layouts or their actions.

## How to extract without changing the UI

1. Capture each affected view in light and dark mode on the web and Electron builds. Include narrow widths, loading/error states, dialogs, quiz taking, and review where relevant.
2. Extract one repeated structure at a time. Preserve DOM order, classes, labels, spacing, focus, and disabled states first. Make any visual unification a separate, reviewable change.
3. Give shared components a small semantic API: content and actions as props or children, with only the variants needed by existing screens. Avoid route names, store calls, or platform checks inside generic layout components.
4. Check all consumers after each extraction, including phone quiz status and timer expiry. Verify `npm run lint`, `npm run build:web`, and `npm run build`.

`npm run lint`, `npm run build:web`, and `npm run build` passed after the P2 implementation. The web library, missing-quiz error state, and New folder dialog were visually checked. The data-dependent quiz screens and Electron UI still need a manual visual check.
