import type { NumericQuestion } from "./types";

/** The longest numeric answer the app accepts. */
export const MAX_NUMERIC_LENGTH = 40;

// Numbers are shown and read in one fixed format, so "1,234.5" means the same everywhere.
const LOCALE = "en-US";
const NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;
const GROUPED = /^[+-]?\d{1,3}(?:,\d{3})+(?:\.\d*)?$/;

/** Whether Intl knows this ISO 4217 code. */
export function isCurrencyCode(code: string): boolean {
  if (!/^[A-Z]{3}$/.test(code)) return false;
  try {
    new Intl.NumberFormat(LOCALE, { style: "currency", currency: code });
    return true;
  } catch {
    return false;
  }
}

/** The symbol shown before a money answer, e.g. "$" for USD or "CA$" for CAD. */
export function currencySymbol(code: string): string {
  const parts = new Intl.NumberFormat(LOCALE, { style: "currency", currency: code }).formatToParts(0);
  return parts.find((part) => part.type === "currency")?.value ?? code;
}

/**
 * Reads a typed answer as a number. Spaces, thousands commas, the question's
 * currency symbol or code, and its unit are ignored. Returns null if it is not a number.
 */
export function parseNumericAnswer(
  text: string,
  question: Pick<NumericQuestion, "currency" | "unit">,
): number | null {
  let value = text.trim();
  if (question.unit && value.endsWith(question.unit)) {
    value = value.slice(0, -question.unit.length);
  }
  if (question.currency) {
    for (const mark of [currencySymbol(question.currency), question.currency, "$"]) {
      value = value.split(mark).join("");
    }
  }
  value = value.replace(/\s+/g, "");
  if (GROUPED.test(value)) value = value.replace(/,/g, "");
  if (!NUMBER.test(value)) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function toleranceOf(question: NumericQuestion): number {
  return question.tolerance ?? 0;
}

/** Whether a typed answer is within the question's tolerance of the correct value. */
export function isNumericCorrect(question: NumericQuestion, text: string): boolean {
  const value = parseNumericAnswer(text, question);
  if (value === null) return false;
  // Allows for binary rounding, so 0.1 + 0.2 still matches 0.3 exactly.
  const slack = 1e-9 * Math.max(1, Math.abs(question.answer));
  return Math.abs(value - question.answer) <= toleranceOf(question) + slack;
}

/** A number as the question shows it: money in its currency, or with its unit. */
export function formatNumeric(
  value: number,
  question: Pick<NumericQuestion, "currency" | "unit">,
): string {
  if (question.currency) {
    const base = new Intl.NumberFormat(LOCALE, { style: "currency", currency: question.currency });
    const digits = base.resolvedOptions().minimumFractionDigits ?? 2;
    return new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency: question.currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: Math.max(digits, 10),
    }).format(value);
  }
  const text = value.toLocaleString(LOCALE, { maximumFractionDigits: 10 });
  return question.unit ? `${text} ${question.unit}` : text;
}

/** The correct answer for display, e.g. "$12.50 ± $0.10" or "45 °". */
export function describeNumericAnswer(question: NumericQuestion): string {
  const answer = formatNumeric(question.answer, question);
  const tolerance = toleranceOf(question);
  return tolerance > 0 ? `${answer} ± ${formatNumeric(tolerance, question)}` : answer;
}

/** A typed answer for display, formatted when it reads as a number. */
export function describeTypedNumber(question: NumericQuestion, text: string): string {
  const value = parseNumericAnswer(text, question);
  return value === null ? text : formatNumeric(value, question);
}
