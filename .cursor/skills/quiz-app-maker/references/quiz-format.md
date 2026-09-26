# Quiz JSON Format (schemaVersion 1)

A quiz is a single JSON file. The top-level object looks like this:

| Field           | Type                                  | Required | Notes                                                                 |
| --------------- | ------------------------------------- | -------- | --------------------------------------------------------------------- |
| `schemaVersion` | `1`                                   | yes      | Always `1` for this format.                                           |
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
| `explanation` | `string` | no       | Optional explanation shown after reveal / in the review screen.                |

## Scenarios

Use a scenario when several questions depend on the same background: a case study, a passage, a data table described in text, or a setup. Write it once in the top-level `scenarios` array and set `scenarioId` on each question that uses it.

| Field   | Type     | Required | Notes                                                       |
| ------- | -------- | -------- | ----------------------------------------------------------- |
| `id`    | `string` | yes      | Unique within `scenarios`. Questions reference it.          |
| `title` | `string` | no       | Heading shown above the text, e.g. `"Case Study 1: ..."`.   |
| `text`  | `string` | yes      | The shared details. Use `\n` for line breaks.               |

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
