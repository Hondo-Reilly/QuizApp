import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { quizApi } from "@/api/quizApi";
import { newPhotoName, processPhoto } from "@/lib/photos";
import { isElectronApp } from "@/lib/runtime";
import {
  addPendingPhoto,
  pendingPhotoUrl,
  subscribePendingPhotos,
} from "@/state/photoStore";

/**
 * Where photos for image-response answers come from on this screen: the quiz
 * in progress, the phone in mobile mode, or a saved attempt.
 */
export interface PhotoSource {
  /** URLs for photo file names; names it can't find are left out. */
  resolve(names: readonly string[]): Promise<Record<string, string>>;
  /** Processes and stores a new photo, returning its file name. */
  add?(questionId: string, file: Blob): Promise<string>;
  /** Re-resolve when this changes, e.g. after a photo is added. */
  subscribe?(listener: () => void): () => void;
}

const PhotoSourceContext = createContext<PhotoSource | null>(null);

export function PhotoSourceProvider({
  source,
  children,
}: {
  source: PhotoSource;
  children: ReactNode;
}) {
  return <PhotoSourceContext.Provider value={source}>{children}</PhotoSourceContext.Provider>;
}

export function usePhotoSource(): PhotoSource | null {
  return useContext(PhotoSourceContext);
}

export function usePhotoUrls(names: readonly string[]): Record<string, string> {
  const source = usePhotoSource();
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [version, setVersion] = useState(0);
  const key = names.join("\n");

  useEffect(() => source?.subscribe?.(() => setVersion((v) => v + 1)), [source]);

  useEffect(() => {
    if (!source || !key) {
      setUrls({});
      return;
    }
    let active = true;
    source
      .resolve(key.split("\n"))
      .then((resolved) => active && setUrls(resolved))
      .catch(() => active && setUrls({}));
    return () => {
      active = false;
    };
  }, [source, key, version]);

  return urls;
}

/** Photos of the quiz in progress, kept in memory until the attempt is saved. */
export const sessionPhotoSource: PhotoSource = {
  async resolve(names) {
    const out: Record<string, string> = {};
    for (const name of names) {
      let url = pendingPhotoUrl(name);
      // A photo taken on the phone in mobile mode lives on the Mac's server.
      if (!url && isElectronApp()) {
        const data = await quizApi.getMobilePhoto(name).catch(() => null);
        if (data) {
          addPendingPhoto(name, data);
          url = pendingPhotoUrl(name);
        }
      }
      if (url) out[name] = url;
    }
    return out;
  },
  async add(questionId, file) {
    const data = await processPhoto(file);
    const name = newPhotoName(questionId);
    addPendingPhoto(name, data);
    return name;
  },
  subscribe: subscribePendingPhotos,
};

/** Photos of a saved attempt. */
export function useAttemptPhotoSource(attemptId: string | null): PhotoSource | null {
  return useMemo(
    () =>
      attemptId
        ? { resolve: (names) => quizApi.getAttemptPhotoUrls(attemptId, [...names]) }
        : null,
    [attemptId],
  );
}
