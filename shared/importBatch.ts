export interface ImportFailure {
  name: string;
  error: string;
}

export function importBatchMessage(
  importedCount: number,
  failures: readonly ImportFailure[],
): string | null {
  if (failures.length === 0) return null;
  const details = failures
    .map((failure) => `${failure.name}: ${failure.error}`)
    .join(" ");
  if (importedCount === 0) return `Could not import ${details}`;
  const saved = importedCount === 1 ? "1 quiz" : `${importedCount} quizzes`;
  return `Imported ${saved}. Could not import ${details}`;
}
