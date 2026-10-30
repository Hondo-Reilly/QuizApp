import { quizApi } from "@/api/quizApi";
import { imageRefs } from "@shared/quizContent";
import type { QuizAssetUpload } from "@shared/types";

/**
 * Stores a copy of a quiz, with its images, in the given folder. The copy is
 * titled "… (copy)" and has no attempts. Returns the copy's id.
 */
export async function duplicateQuiz(id: string, folderId: string | null): Promise<string> {
  const quiz = await quizApi.getQuiz(id);
  if (!quiz) throw new Error("Quiz not found");
  const paths = imageRefs(quiz);
  const urls = paths.length > 0 ? await quizApi.getQuizAssetUrls(id, paths) : {};
  const uploads: QuizAssetUpload[] = [];
  for (const path of paths) {
    const response = urls[path] ? await fetch(urls[path]) : null;
    if (!response?.ok) throw new Error(`An image of this quiz is missing (${path}).`);
    uploads.push({ path, data: new Uint8Array(await response.arrayBuffer()) });
  }
  const meta = await quizApi.createQuiz({ ...quiz, title: `${quiz.title} (copy)` }, folderId, uploads);
  return meta.id;
}
