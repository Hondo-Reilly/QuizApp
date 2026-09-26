/** Fades out the launch splash from index.html, then removes it. */
export function hideSplash(): void {
  const splash = document.getElementById("splash");
  if (!splash || splash.classList.contains("splash-hidden")) return;
  splash.classList.add("splash-hidden");
  const remove = () => splash.remove();
  splash.addEventListener("transitionend", remove, { once: true });
  window.setTimeout(remove, 400);
}
