import type { Folder, Quiz, QuizMetadata } from "./types";

export function toMetadata(
  quiz: Quiz,
  importedAt: string,
  folderId: string | null,
): QuizMetadata {
  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    author: quiz.author,
    tags: quiz.tags,
    questionCount: quiz.questions.length,
    importedAt,
    folderId,
  };
}

export function collectDescendantFolderIds(
  folders: readonly Folder[],
  rootId: string,
): Set<string> {
  const childrenByParent = new Map<string, Folder[]>();
  for (const folder of folders) {
    if (!folder.parentId) continue;
    const list = childrenByParent.get(folder.parentId);
    if (list) list.push(folder);
    else childrenByParent.set(folder.parentId, [folder]);
  }
  const ids = new Set<string>();
  const stack = [rootId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (ids.has(id)) continue;
    ids.add(id);
    for (const child of childrenByParent.get(id) ?? []) stack.push(child.id);
  }
  return ids;
}
