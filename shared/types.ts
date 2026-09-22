export type QuestionType = "true_false" | "multiple_choice" | "multi_answer";

export interface Choice {
  id: string;
  text: string;
}

export interface TrueFalseQuestion {
  id: string;
  type: "true_false";
  prompt: string;
  answer: boolean;
  explanation?: string;
}

export interface MultipleChoiceQuestion {
  id: string;
  type: "multiple_choice";
  prompt: string;
  choices: Choice[];
  answer: string;
  explanation?: string;
}

export interface MultiAnswerQuestion {
  id: string;
  type: "multi_answer";
  prompt: string;
  choices: Choice[];
  answers: string[];
  explanation?: string;
}

export type Question =
  | TrueFalseQuestion
  | MultipleChoiceQuestion
  | MultiAnswerQuestion;

export interface Quiz {
  schemaVersion: 1;
  id: string;
  title: string;
  description?: string;
  author?: string;
  tags?: string[];
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
}

export type UserAnswer = boolean | string | string[] | null;

export interface QuizAttempt {
  id: string;
  quizId: string;
  completedAt: string;
  correct: number;
  total: number;
  percent: number;
  questionIds: string[];
  answers: Record<string, UserAnswer>;
}

export interface SaveAttemptInput {
  quizId: string;
  correct: number;
  total: number;
  percent: number;
  questionIds: string[];
  answers: Record<string, UserAnswer>;
}

export interface QuestionResult {
  questionId: string;
  correct: boolean;
  userAnswer: UserAnswer;
}

export interface QuizGrade {
  total: number;
  correct: number;
  percent: number;
  results: QuestionResult[];
}

export type RevealMode = "after_each" | "at_end";
