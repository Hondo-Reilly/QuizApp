import { timingSafeEqual } from "node:crypto";

const MAX_MOBILE_BODY = 64 * 1024;

export function mobileTokensMatch(
  provided: string | null,
  expected: string,
): boolean {
  if (!provided) return false;
  const given = Buffer.from(provided);
  const actual = Buffer.from(expected);
  if (given.length !== actual.length) return false;
  return timingSafeEqual(given, actual);
}

export function mobileOriginAllowed(
  origin: string | undefined,
  host: string | undefined,
): boolean {
  if (!origin) return true;
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function mobileJsonContentType(contentType: string | undefined): boolean {
  return (contentType ?? "").toLowerCase().startsWith("application/json");
}

export function mobileBodyWithinLimit(size: number): boolean {
  return size <= MAX_MOBILE_BODY;
}

export const MOBILE_BODY_LIMIT = MAX_MOBILE_BODY;
