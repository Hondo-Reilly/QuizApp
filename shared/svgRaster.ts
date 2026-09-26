/**
 * Renders SVG source to a base64 PNG inside a web page.
 *
 * The SVG is drawn as an <img>, where scripts never run and external files are
 * never loaded, then copied to a canvas. It is rendered at twice its size for
 * sharp text, with the long side kept between 800 and 2400 pixels.
 *
 * This function must stay self-contained: the desktop app runs its source text
 * in a hidden window, so it cannot use imports or anything outside its body.
 */
export async function rasterizeSvgInPage(svgText: string): Promise<string> {
  const doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
  const root = doc.documentElement;
  if (root.nodeName.toLowerCase() !== "svg" || doc.getElementsByTagName("parsererror").length) {
    throw new Error("the file is not valid SVG");
  }

  // Drop anything that could run or reach outside the file. None of it would
  // work in an <img> anyway, and a blocked external image would otherwise be
  // drawn as a broken-image icon.
  for (const el of Array.from(root.querySelectorAll("script, foreignObject"))) el.remove();
  for (const el of Array.from(root.querySelectorAll("*"))) {
    const href = el.getAttribute("href") ?? el.getAttribute("xlink:href");
    if (href !== null && !/^\s*(#|data:image\/(png|jpe?g|gif|webp);)/i.test(href)) {
      el.remove();
      continue;
    }
    for (const attr of Array.from(el.attributes)) {
      if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
    }
  }

  const length = (value: string | null): number => {
    if (!value || /%\s*$/.test(value)) return NaN;
    const parsed = parseFloat(value);
    return parsed > 0 && Number.isFinite(parsed) ? parsed : NaN;
  };
  const box = (root.getAttribute("viewBox") ?? "").trim().split(/[\s,]+/).map(Number);
  const hasBox = box.length === 4 && box[2] > 0 && box[3] > 0;
  let width = length(root.getAttribute("width"));
  let height = length(root.getAttribute("height"));
  if (!(width > 0) && !(height > 0)) {
    width = hasBox ? box[2] : 800;
    height = hasBox ? box[3] : 600;
  } else if (!(width > 0)) {
    width = hasBox ? (height * box[2]) / box[3] : height;
  } else if (!(height > 0)) {
    height = hasBox ? (width * box[3]) / box[2] : width;
  }
  if (!hasBox) root.setAttribute("viewBox", `0 0 ${width} ${height}`);

  const longSide = Math.max(width, height);
  const scale = Math.min(Math.max(2, 800 / longSide), 2400 / longSide);
  const pixelWidth = Math.max(1, Math.round(width * scale));
  const pixelHeight = Math.max(1, Math.round(height * scale));
  root.setAttribute("width", String(pixelWidth));
  root.setAttribute("height", String(pixelHeight));

  const source = new XMLSerializer().serializeToString(root);
  const url = URL.createObjectURL(new Blob([source], { type: "image/svg+xml" }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("the SVG could not be drawn"));
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("no canvas is available");
    context.drawImage(image, 0, 0, pixelWidth, pixelHeight);
    const dataUrl = canvas.toDataURL("image/png");
    return dataUrl.slice(dataUrl.indexOf(",") + 1);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
