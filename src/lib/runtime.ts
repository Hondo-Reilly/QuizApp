export function isElectronApp(): boolean {
  return typeof window !== "undefined" && !!window.quizApi;
}
