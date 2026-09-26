export type QuestionType =
  | "true_false"
  | "multiple_choice"
  | "multi_answer"
  | "short_answer"
  | "long_answer"
  | "image_response";

export type TextFormat = "plain" | "markdown";

export interface QuizImage {
  /** Path inside the .quiz package, e.g. "images/diagram.png". */
  src: string;
  alt?: string;
}

export interface Scenario {
  id: string;
  title?: string;
  text: string;
  image?: QuizImage;
}

export interface Choice {
  id: string;
  /** May be empty when the choice has an image. */
  text: string;
  image?: QuizImage;
}

export interface TrueFalseQuestion {
  id: string;
  type: "true_false";
  scenarioId?: string;
  prompt: string;
  image?: QuizImage;
  answer: boolean;
  explanation?: string;
}

export interface MultipleChoiceQuestion {
  id: string;
  type: "multiple_choice";
  scenarioId?: string;
  prompt: string;
  image?: QuizImage;
  choices: Choice[];
  answer: string;
  explanation?: string;
}

export interface MultiAnswerQuestion {
  id: string;
  type: "multi_answer";
  scenarioId?: string;
  prompt: string;
  image?: QuizImage;
  choices: Choice[];
  answers: string[];
  explanation?: string;
}

/** Fields shared by the question types the app does not grade itself. */
interface WrittenQuestionFields {
  id: string;
  scenarioId?: string;
  prompt: string;
  image?: QuizImage;
  explanation?: string;
  /** A model answer, shown after the user submits and on review screens. */
  sampleAnswer?: string;
  /** Points a good answer covers. Used by people and AI to grade. */
  rubric?: string[];
}

export interface ShortAnswerQuestion extends WrittenQuestionFields {
  type: "short_answer";
  minLength?: number;
  maxLength?: number;
}

export interface LongAnswerQuestion extends WrittenQuestionFields {
  type: "long_answer";
  minLength?: number;
  maxLength?: number;
  /** Answer in a code editor with line numbers and syntax highlighting. */
  code?: boolean;
  /** Highlighting language for a code answer, e.g. "python". Detected when omitted. */
  language?: string;
}

export interface ImageResponseQuestion extends WrittenQuestionFields {
  type: "image_response";
  /** How many photos the user may attach. Defaults to 1. */
  maxImages?: number;
}

export type ChoiceQuestion = MultipleChoiceQuestion | MultiAnswerQuestion;

/** Questions the app cannot grade: written text and photo responses. */
export type OpenQuestion =
  | ShortAnswerQuestion
  | LongAnswerQuestion
  | ImageResponseQuestion;

export type Question =
  | TrueFalseQuestion
  | MultipleChoiceQuestion
  | MultiAnswerQuestion
  | OpenQuestion;

export interface Quiz {
  schemaVersion: 1 | 2;
  /** Version 2 only. Defaults to "plain". */
  textFormat?: TextFormat;
  id: string;
  title: string;
  description?: string;
  author?: string;
  tags?: string[];
  scenarios?: Scenario[];
  questions: Question[];
}

export interface QuizMetadata {
  id: string;
  title: string;
  description?: string;
  author?: string;
  tags?: string[];
  questionCount: number;
  importedAt: string;
  folderId: string | null;
}

export interface Folder {
  id: string;
  name: string;
  description?: string;
  parentId: string | null;
  createdAt: string;
}

export interface LibrarySnapshot {
  folders: Folder[];
  quizzes: QuizMetadata[];
}

export interface UpdateCheck {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion: string | null;
  downloadUrl: string | null;
  releaseNotes: string | null;
}

export interface UpdateProgress {
  received: number;
  total: number | null;
  percent: number | null;
}

/** A photo response: file names of the attempt's stored photos, e.g. "q10-1.jpg". */
export interface PhotoAnswer {
  photos: string[];
}

/**
 * The answer's shape depends on the question type: a boolean for true/false,
 * a choice id or written text as a string, choice ids as a string array, or
 * photo file names for an image response.
 */
export type UserAnswer = boolean | string | string[] | PhotoAnswer | null;

/** How the user marked their own open answer, when self-marking is on. */
export type SelfMark = "got" | "missed" | "unsure";

export interface QuizAttempt {
  id: string;
  quizId: string;
  startedAt?: string;
  completedAt: string;
  /** Questions graded correct: auto-graded, plus open answers self-marked "got". */
  correct: number;
  /** Questions with a grade. Open answers without a self-mark are not counted. */
  total: number;
  percent: number;
  /** Open answers left without a grade. Missing on older attempts, meaning 0. */
  ungraded?: number;
  questionIds: string[];
  answers: Record<string, UserAnswer>;
  /** Questions the user flagged to study. Missing on attempts saved before v0.5.0. */
  flagged?: string[];
  /** Whether the user chose to mark their own open answers for this attempt. */
  selfMarking?: boolean;
  selfMarks?: Record<string, SelfMark>;
}

/** A photo taken for an image response, already resized and re-encoded as JPEG. */
export interface AttemptPhoto {
  /** File name the answers refer to, e.g. "q10-1.jpg". */
  name: string;
  data: Uint8Array;
}

/** A new score after self-marks change. */
export interface AttemptScore {
  correct: number;
  total: number;
  percent: number;
  ungraded: number;
}

export interface SaveAttemptInput {
  quizId: string;
  startedAt: string;
  correct: number;
  total: number;
  percent: number;
  questionIds: string[];
  answers: Record<string, UserAnswer>;
  flagged?: string[];
  ungraded?: number;
  selfMarking?: boolean;
  selfMarks?: Record<string, SelfMark>;
  /** Photos the answers refer to. Stored with the attempt. */
  photos?: AttemptPhoto[];
}

export type QuestionOutcome = "correct" | "wrong" | "ungraded";

export interface QuestionResult {
  questionId: string;
  /** True only for a correct outcome. */
  correct: boolean;
  outcome: QuestionOutcome;
  userAnswer: UserAnswer;
}

export interface QuizGrade {
  /** Questions with a grade; ungraded open answers are left out. */
  total: number;
  correct: number;
  percent: number;
  ungraded: number;
  results: QuestionResult[];
}

export type RevealMode = "after_each" | "at_end";
