/**
 * The keys for the placeholder blocks in a skeleton.
 *
 * They are stable names and not the index, so a list of placeholders never
 * reshuffles itself when it is re-rendered.
 */
const NAMES = [
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
];

/** The first `count` stable placeholder keys. */
export function placeholderKeys(count: number): string[] {
  return NAMES.slice(0, count);
}
