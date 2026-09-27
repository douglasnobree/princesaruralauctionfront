import { timingSafeEqual } from "node:crypto";

export function validGoogleCsrf(cookie: string | undefined, submitted: FormDataEntryValue | null) {
  if (!cookie || cookie.length > 256 || typeof submitted !== "string" || submitted.length !== cookie.length) return false;
  const expected = Buffer.from(cookie);
  const actual = Buffer.from(submitted);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function safeGoogleReturnTo(value: FormDataEntryValue | null, fallback: string) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\r\n\0]/.test(value)) return fallback;
  return value;
}
