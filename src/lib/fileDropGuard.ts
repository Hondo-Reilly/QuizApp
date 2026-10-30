/** True when a drag carries files from outside the page, not a quiz card. */
function carriesFiles(event: DragEvent): boolean {
  return [...(event.dataTransfer?.types ?? [])].includes("Files");
}

/**
 * Stops a file dropped outside a drop zone from opening in place of the app.
 * Browsers and Electron load a dropped file into the window unless the page
 * handles the drop. Drop zones handle their own drops first.
 */
export function installFileDropGuard(target: Window): void {
  target.addEventListener("dragover", (event) => {
    if (event.defaultPrevented || !carriesFiles(event)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "none";
  });
  target.addEventListener("drop", (event) => {
    if (event.defaultPrevented || !carriesFiles(event)) return;
    event.preventDefault();
  });
}
