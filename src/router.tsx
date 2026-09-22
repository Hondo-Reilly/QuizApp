import { createHashRouter, Navigate } from "react-router-dom";
import { App } from "./App";
import { LibraryPage } from "./pages/LibraryPage";
import { QuizSetupPage } from "./pages/QuizSetupPage";
import { TakeQuizPage } from "./pages/TakeQuizPage";
import { ReviewPage } from "./pages/ReviewPage";
import { QuizBrowsePage } from "./pages/QuizBrowsePage";
import { QuizAttemptPage } from "./pages/QuizAttemptPage";

export const router = createHashRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <LibraryPage /> },
      { path: "folder/:folderId", element: <LibraryPage /> },
      { path: "quiz/:id", element: <QuizBrowsePage /> },
      { path: "quiz/:id/attempt/:attemptId", element: <QuizAttemptPage /> },
      { path: "quiz/:id/setup", element: <QuizSetupPage /> },
      { path: "quiz/:id/take", element: <TakeQuizPage /> },
      { path: "quiz/:id/review", element: <ReviewPage /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
