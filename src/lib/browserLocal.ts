export function pickQuizFiles(): Promise<File[] | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".quiz,.json,application/json";
    input.multiple = true;
    let settled = false;
    const finish = (files: File[] | null) => {
      if (settled) return;
      settled = true;
      resolve(files);
    };
    input.addEventListener("change", () => {
      finish(Array.from(input.files ?? []));
    });
    input.addEventListener("cancel", () => finish(null));
    window.addEventListener(
      "focus",
      () => {
        window.setTimeout(() => finish(null), 1000);
      },
      { once: true },
    );
    input.click();
  });
}

export function downloadBytes(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes as BlobPart], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function printHtml(html: string): Promise<boolean> {
  const iframe = document.createElement("iframe");
  iframe.title = "Print quiz";
  iframe.setAttribute(
    "style",
    "position:fixed;left:-10000px;top:0;width:800px;height:1000px;border:0",
  );

  return new Promise((resolve) => {
    let settled = false;
    const finish = (printed: boolean) => {
      if (settled) return;
      settled = true;
      iframe.remove();
      resolve(printed);
    };

    iframe.onload = () => {
      const frame = iframe.contentWindow;
      if (!frame) {
        finish(false);
        return;
      }
      frame.addEventListener("afterprint", () => finish(true), { once: true });
      window.setTimeout(() => finish(true), 60_000);
      frame.focus();
      frame.print();
    };

    iframe.srcdoc = html;
    document.body.appendChild(iframe);
  });
}
