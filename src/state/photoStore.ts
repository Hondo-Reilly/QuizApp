/**
 * Photos taken during the quiz in progress, kept in memory until the attempt is
 * saved, like the answers themselves.
 */
interface PendingPhoto {
  data: Uint8Array;
  url: string;
}

const photos = new Map<string, PendingPhoto>();
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

export function addPendingPhoto(name: string, data: Uint8Array): void {
  const existing = photos.get(name);
  if (existing) URL.revokeObjectURL(existing.url);
  const url = URL.createObjectURL(new Blob([data as BlobPart], { type: "image/jpeg" }));
  photos.set(name, { data, url });
  notify();
}

export function pendingPhotoUrl(name: string): string | undefined {
  return photos.get(name)?.url;
}

export function pendingPhotoData(name: string): Uint8Array | undefined {
  return photos.get(name)?.data;
}

export function clearPendingPhotos(): void {
  for (const photo of photos.values()) URL.revokeObjectURL(photo.url);
  photos.clear();
  notify();
}

export function subscribePendingPhotos(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
