# QuizApp Attempt Export Format

QuizApp exports finished attempts as JSON. There are two shapes.

- **One attempt** comes from **Export attempt** on an attempt's page. It has a top-level `questions` array.
- **Several attempts** comes from **Export selected** in a quiz's attempt list. It has a top-level `attempts` array, and each attempt has its own `questions`.

`schemaVersion` is the export format's version, not the quiz's. Version 2 (QuizApp v0.5.0 and later) adds `outcome`, `selfMark`, `ungraded`, and `selfMarking`, and lets `correct` and `percent` be `null`. Version 1 exports have none of these; every question there is auto-graded.

## `.attempt` packages

When an attempt includes **photo answers**, QuizApp exports a `.attempt` file instead of plain JSON. It is a zip:

```
<quiz>-<date>.attempt
├── attempt.json                     the export JSON described below
├── responses/<attemptId>/<file>.jpg photo answers, one folder per attempt
└── images/…                         the quiz's own images (question, choice, scenario)
```

Unzip it (rename to `.zip` if a tool insists) and read `attempt.json`. Paths in it, such as a photo answer's `selected.photos` or a question's `image.src`, are relative to the package root, so you can open the files they name.

## One attempt

| Field           | Type                   | Notes                                                                 |
| --------------- | ---------------------- | --------------------------------------------------------------------- |
| `schemaVersion` | `1`                    | Export format version.                                                |
| `id`            | `string`               | The quiz's id.                                                        |
| `title`         | `string`               | The quiz's title.                                                     |
| `description`   | `string`               | Optional. The quiz's description.                                     |
| `author`        | `string`               | Optional.                                                             |
| `tags`          | `string[]`             | Optional. Useful hints about the subject.                             |
| `textFormat`    | `"plain"`/`"markdown"` | Optional. `"markdown"` means text fields contain Markdown and LaTeX.  |
| `scenarios`     | `Scenario[]`           | Optional. Shared case studies that questions point to.                |
| `completedAt`   | ISO date               | When the attempt was finished.                                        |
| `correct`       | `number`               | Questions graded correct.                                             |
| `wrong`         | `number`               | Questions graded wrong, including unanswered choice questions.        |
| `ungraded`      | `number`               | Written and photo answers with no grade. Not in `correct`, `wrong`, or `percent`. |
| `percent`       | `number` or `null`     | Score over graded questions, 0–100, rounded. `null` when nothing was graded. |
| `selfMarking`   | `boolean`              | Whether the user chose to mark their own written and photo answers.   |
| `flaggedCount`  | `number`               | How many questions the user flagged to study.                         |
| `questions`     | `ExportedQuestion[]`   | Every question in the attempt, in the order it was shown.             |

## Several attempts

The top level has the quiz fields above (`schemaVersion`, `id`, `title`, `description`, `author`, `tags`, `textFormat`, `scenarios`) plus `attempts`. Each attempt has:

| Field          | Type                 | Notes                              |
| -------------- | -------------------- | ---------------------------------- |
| `id`           | `string`             | The attempt's id.                  |
| `completedAt`  | ISO date             | When it was finished.              |
| `correct`      | `number`             |                                    |
| `wrong`        | `number`             |                                    |
| `ungraded`     | `number`             |                                    |
| `percent`      | `number` or `null`   |                                    |
| `selfMarking`  | `boolean`            |                                    |
| `flaggedCount` | `number`             |                                    |
| `questions`    | `ExportedQuestion[]` | The questions of that attempt.     |

Attempts are listed newest first. When questions were shuffled or a random subset was used, different attempts can contain different questions in different orders. Match questions across attempts by `id`.

## ExportedQuestion

Each exported question is the quiz question itself plus results fields.

| Field         | Type                     | Notes                                                                 |
| ------------- | ------------------------ | --------------------------------------------------------------------- |
| `id`          | `string`                 | Stable across attempts.                                               |
| `type`        | enum                     | Auto-graded: `"true_false"`, `"multiple_choice"`, `"multi_answer"`. Open (not auto-graded): `"short_answer"`, `"long_answer"`, `"image_response"`. |
| `prompt`      | `string`                 | The question text.                                                    |
| `scenarioId`  | `string`                 | Optional. Points to `scenarios[].id`; read that scenario for context. |
| `image`       | `{ src, alt? }`          | Optional. The image itself is not in the export; only `alt` describes it. |
| `choices`     | `{ id, text, image? }[]` | For `multiple_choice` and `multi_answer`.                             |
| `answer`      | `boolean` or `string`    | The correct answer: a boolean for `true_false`, a choice id for `multiple_choice`. |
| `answers`     | `string[]`               | For `multi_answer`: every correct choice id.                          |
| `explanation` | `string`                 | Optional. Why the answer is right.                                    |
| `sampleAnswer`| `string`                 | Open questions, optional. The quiz author's model answer.             |
| `rubric`      | `string[]`               | Open questions, optional. Points a good answer covers. Grade against these. |
| `minLength`, `maxLength` | `number`      | Text questions, optional. Character limits the user had.              |
| `code`, `language` | `boolean`, `string` | `long_answer` only. A code answer, and its language.                  |
| `maxImages`   | `number`                 | `image_response` only. How many photos were allowed.                  |
| `selected`    | see below                | What the user answered.                                               |
| `outcome`     | `"correct"`, `"wrong"`, `"ungraded"` | The result.                                               |
| `correct`     | `boolean` or `null`      | `true`/`false` from `outcome`; `null` when ungraded.                  |
| `selfMark`    | `"got"`, `"missed"`, `"unsure"` | Open questions only, when the user marked their own answer.     |
| `flagged`     | `boolean`                | The user marked this question to study.                               |

### `selected`

| Question type     | `selected`                                        |
| ----------------- | ------------------------------------------------- |
| `true_false`      | `true` or `false`                                 |
| `multiple_choice` | One choice id, e.g. `"b"`                         |
| `multi_answer`    | An array of choice ids, e.g. `["a", "c"]`         |
| `short_answer`, `long_answer` | The user's text (code for a code answer) |
| `image_response`  | `{ "photos": ["responses/<attemptId>/<file>.jpg"] }`, paths inside the `.attempt` package |
| any               | `null` if the question was left unanswered        |

Map choice ids to `choices[].text` before talking about them. Users never see the ids.

### Grading

- `multi_answer` is correct only when the selected set exactly matches `answers`. A partly right selection, such as two of three correct choices, is graded wrong. Say which choices were missed or added.
- An unanswered question (`selected: null`) is graded wrong. Many unanswered questions at the end of an attempt usually mean time ran out.
- For auto-graded questions, treat `correct` as authoritative. Don't regrade.
- Open questions are never graded by QuizApp. With `selfMarking` on, the user compared their answer with the sample: `"got"` counts as correct, `"missed"` as wrong, and `"unsure"` stays ungraded and also flags the question. Without a self-mark, `outcome` is `"ungraded"`. A self-mark is the user's own judgment, not a verified grade.

### `flagged`

Users flag a question when they want to study it, whether or not they got it right. A flag on a correct answer usually means a guess or low confidence. Attempts saved before QuizApp v0.5.0 have no flags, so every question shows `flagged: false`.

## Example

- `example-attempt-export.json`: a one-attempt export of choice questions, 4 of 7 correct, with three flagged questions, two of which were answered correctly.
- `example-written-attempt.json`: the `attempt.json` of an `.attempt` package with written, code, and photo answers and self-marks. Its photo file isn't included here. Note the `seasons` answer: the user self-marked it "got", but it repeats the distance misconception the rubric rules out.
