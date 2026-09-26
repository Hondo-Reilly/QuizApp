# Quiz Format (schemaVersion 1 and 2)

A quiz is a single JSON file. A quiz with images is a **`.quiz` package**: a zip file that holds that JSON as `quiz.json` plus an `images/` folder (see [Images and .quiz packages](#images-and-quiz-packages)).

- **Version 1** is plain text only. Every existing quiz keeps working unchanged.
- **Version 2** adds optional Markdown with math (`textFormat`) and images. A version 2 quiz that uses neither looks exactly like version 1.

The top-level object looks like this:

| Field           | Type                                  | Required | Notes                                                                 |
| --------------- | ------------------------------------- | -------- | --------------------------------------------------------------------- |
| `schemaVersion` | `1` or `2`                            | yes      | Use `2` for Markdown or images; `1` otherwise.                        |
| `textFormat`    | `"plain"` or `"markdown"`             | no       | Version 2 only. Defaults to `"plain"`. See [Rich text](#rich-text-markdown-and-math). |
| `id`            | `string` (slug)                       | no       | If omitted, the app generates one on import.                          |
| `title`         | `string`                              | yes      | Shown in the library and at the top of the quiz.                      |
| `description`   | `string`                              | no       | Short summary shown on the setup screen.                              |
| `author`        | `string`                              | no       | Free-form attribution.                                                |
| `tags`          | `string[]`                            | no       | Used for grouping/filtering in future versions.                       |
| `scenarios`     | `Scenario[]`                          | no       | Shared case studies or passages that questions can point at.          |
| `questions`     | `Question[]` (1+ items)               | yes      | At least one question is required.                                    |

## Question types

Every question has these common fields:

| Field         | Type     | Required | Notes                                                                          |
| ------------- | -------- | -------- | ------------------------------------------------------------------------------ |
| `id`          | `string` | yes      | Stable identifier, unique within the quiz. Used to record answers.             |
| `type`        | enum     | yes      | One of `"true_false"`, `"multiple_choice"`, `"multi_answer"`.                  |
| `scenarioId`  | `string` | no       | The `id` of a scenario to show above the prompt. Must match `scenarios[].id`.  |
| `prompt`      | `string` | yes      | The question text shown to the user.                                           |
| `image`       | `Image`  | no       | Version 2 only. An image shown below the prompt.                               |
| `explanation` | `string` | no       | Optional explanation shown after reveal / in the review screen.                |

## Scenarios

Use a scenario when several questions depend on the same background: a case study, a passage, a data table described in text, or a setup. Write it once in the top-level `scenarios` array and set `scenarioId` on each question that uses it.

| Field   | Type     | Required | Notes                                                       |
| ------- | -------- | -------- | ----------------------------------------------------------- |
| `id`    | `string` | yes      | Unique within `scenarios`. Questions reference it.          |
| `title` | `string` | no       | Heading shown above the text, e.g. `"Case Study 1: ..."`.   |
| `text`  | `string` | yes      | The shared details. Use `\n` for line breaks.               |
| `image` | `Image`  | no       | Version 2 only. An image shown below the text.              |

```json
{
  "schemaVersion": 1,
  "title": "Penetrant Testing",
  "scenarios": [
    {
      "id": "case-1",
      "title": "Case Study 1: Validating a Fluorescent PT Examination",
      "text": "Inspection goal: detect fine surface-breaking fatigue cracks in a nickel-alloy bracket. ..."
    }
  ],
  "questions": [
    { "id": "q1", "scenarioId": "case-1", "type": "multiple_choice", "prompt": "What should the inspector do with the current result?", "...": "..." },
    { "id": "q2", "scenarioId": "case-1", "type": "multiple_choice", "prompt": "Which setup should be used for the repeat examination?", "...": "..." }
  ]
}
```

- The scenario is shown above the prompt on every question that references it.
- Questions that share a scenario stay together, in file order, when questions are shuffled. Keep them adjacent in `questions`.
- Questions without `scenarioId` work as before, so a quiz can mix both.

### `true_false`

```json
{
  "id": "q1",
  "type": "true_false",
  "prompt": "The Earth orbits the Sun.",
  "answer": true,
  "explanation": "Heliocentric model."
}
```

- `answer` is a boolean.

### `multiple_choice` (exactly one correct answer)

```json
{
  "id": "q2",
  "type": "multiple_choice",
  "prompt": "What is 2 + 2?",
  "choices": [
    { "id": "a", "text": "3" },
    { "id": "b", "text": "4" },
    { "id": "c", "text": "5" }
  ],
  "answer": "b",
  "explanation": "Basic addition."
}
```

- `choices` must contain at least 2 entries with unique `id`s.
- `answer` must match one of the `choices[].id` values.
- In version 2 a choice may also have an `image`. A choice with an image may leave `text` as `""`.

### `multi_answer` (select all that apply)

```json
{
  "id": "q3",
  "type": "multi_answer",
  "prompt": "Which numbers are prime?",
  "choices": [
    { "id": "a", "text": "2" },
    { "id": "b", "text": "4" },
    { "id": "c", "text": "5" },
    { "id": "d", "text": "9" }
  ],
  "answers": ["a", "c"],
  "explanation": "2 and 5 are prime."
}
```

- `choices` must contain at least 2 entries with unique `id`s.
- `answers` is a non-empty array of `choices[].id` values.
- `answers` must not repeat an id.
- A response is graded correct only if the user's selected set exactly matches `answers`.

## Rich text (Markdown and math)

Set `"schemaVersion": 2` and `"textFormat": "markdown"` to write Markdown. Without it, text is shown exactly as written, so `*`, `_`, and `$` in older quizzes never turn into formatting.

Markdown applies to `prompt`, choice `text`, `explanation`, and scenario `text`. Titles, descriptions, and scenario titles stay plain.

| Write | Shows |
| --- | --- |
| `**bold**`, `*italic*`, `` `code` `` | **bold**, *italic*, `code` |
| `- item` or `1. item` on their own lines | Lists |
| Three backticks (and a language) on the lines before and after code | A code block |
| A pipe table (`\| a \| b \|`) | A table |
| `[text](https://example.com)` | A link that opens in the browser |
| `$x^2 + 1$` | Inline math (LaTeX, rendered with KaTeX) |
| `$$\frac{a}{b}$$` | Display math on its own line |
| `![alt text](images/diagram.png)` | An image from the package |

- In JSON, write each LaTeX backslash twice and each line break as `\n`: `"$\\sqrt{2}$"` in the file is `$\sqrt{2}$`.
- A single `$` followed by a digit, as in `$5 and $10`, stays plain text, so prices are safe.
- Raw HTML is not rendered. It is shown as text.

## Images and .quiz packages

An image is an object:

```json
{ "src": "images/triangle.png", "alt": "Right triangle with legs 6 cm and 8 cm" }
```

- `src` must be a path inside the package's `images/` folder (subfolders are fine) ending in `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, or `.svg`. Remote URLs are not allowed.
- **SVG files are converted to PNG when the quiz is imported,** and the quiz's references are updated to match (`images/diagram.svg` becomes `images/diagram.png`, or `images/diagram-svg.png` if that name is taken). The PNG is rendered at twice the SVG's size, with the long side between 800 and 2400 pixels. Give the SVG a `viewBox` or `width` and `height` so its size is known. Scripts, `foreignObject`, and links to outside files are removed before rendering, so an SVG must be self-contained. Exporting the quiz afterwards produces the PNGs.
- `alt` describes the image. It is shown if the image cannot be loaded and read by screen readers.
- Use `image` on a question, choice, or scenario. In a Markdown quiz you can also place images inside text with `![alt](images/file.png)`.
- Images require `"schemaVersion": 2`, and a quiz that uses images must be imported as a `.quiz` package. A plain `.json` quiz that references images is rejected.

A `.quiz` package is a zip file renamed to `.quiz`:

```
triangles.quiz
├── quiz.json
└── images/
    ├── triangle.png
    └── graphs/parabola.png
```

- `quiz.json` may sit at the top of the zip or inside one top-level folder, which is what macOS **Compress** creates.
- Every image the quiz references must be in the package, and each file must really be the image type its extension says.
- Each image can be at most 10 MB, and the unzipped package at most 100 MB. Files the quiz does not reference are ignored.

To build one, put `quiz.json` and `images/` in a folder and zip them:

```
cd my-quiz && zip -r ../my-quiz.quiz quiz.json images
```

In this repository, `npm run pack-quiz -- <folder> [output.quiz]` does the same and checks the result the way the app does on import. `sample-quizzes/rich-content-demo/` is a complete example.

## Example quiz

A complete, valid quiz combining all three question types:

```json
{
  "schemaVersion": 1,
  "title": "Quick Mixed Quiz",
  "description": "A short demo covering all three question types.",
  "author": "QuizApp",
  "tags": ["sample"],
  "questions": [
    {
      "id": "q1",
      "type": "true_false",
      "prompt": "Water boils at 100 degrees Celsius at sea level.",
      "answer": true,
      "explanation": "At standard atmospheric pressure (1 atm)."
    },
    {
      "id": "q2",
      "type": "multiple_choice",
      "prompt": "Which planet is closest to the Sun?",
      "choices": [
        { "id": "a", "text": "Venus" },
        { "id": "b", "text": "Mercury" },
        { "id": "c", "text": "Earth" }
      ],
      "answer": "b",
      "explanation": "Mercury orbits at about 0.39 AU."
    },
    {
      "id": "q3",
      "type": "multi_answer",
      "prompt": "Which of these are programming languages?",
      "choices": [
        { "id": "a", "text": "Python" },
        { "id": "b", "text": "HTML" },
        { "id": "c", "text": "Rust" },
        { "id": "d", "text": "JSON" }
      ],
      "answers": ["a", "c"],
      "explanation": "HTML is a markup language and JSON is a data format."
    }
  ]
}
```

## When generating a quiz

Output only the JSON object, with no surrounding commentary or code fence, so it can be saved directly to a `.json` file.
