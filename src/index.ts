export type NormalizeJaInputOptions = {
  /** Trim leading and trailing whitespace after normalization. */
  trim?: boolean

  /** Collapse ASCII whitespace, or only spaces and tabs with "horizontal". */
  collapseSpaces?: boolean | "horizontal"

  /** Convert full-width spaces to half-width spaces. */
  spaces?: "preserve" | "halfwidth"

  /** Convert full-width digits to half-width digits. */
  digits?: "preserve" | "halfwidth"

  /** Convert full-width Latin alphabets to half-width alphabets. */
  alphabets?: "preserve" | "halfwidth"

  /** Convert hyphen variants everywhere or only between ASCII or full-width digits. */
  hyphens?: "preserve" | "ascii" | "between-digits"
}

const DEFAULT_OPTIONS: Required<NormalizeJaInputOptions> = {
  trim: true,
  collapseSpaces: true,
  spaces: "halfwidth",
  digits: "halfwidth",
  alphabets: "halfwidth",
  hyphens: "ascii",
}

const FULLWIDTH_DIGIT_OFFSET = 0xfee0
const FULLWIDTH_ALPHABET_OFFSET = 0xfee0
const HYPHEN_LIKE_CHARS = /[ー－―‐‑‒–—−﹣ｰ]/g
const DIGIT = /[0-9０-９]/

/**
 * Normalize common Japanese form input variations.
 *
 * @example
 * ```ts
 * normalizeJaInput("　ＴＥＬ：０９０ー１２３４ー５６７８　")
 * // => "TEL：090-1234-5678"
 * ```
 */
export function normalizeJaInput(
  input: string,
  options: NormalizeJaInputOptions = {},
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let value = input

  if (opts.spaces === "halfwidth") {
    value = value.replace(/\u3000/g, " ")
  }

  if (opts.digits === "halfwidth") {
    value = value.replace(/[０-９]/g, char =>
      String.fromCharCode(char.charCodeAt(0) - FULLWIDTH_DIGIT_OFFSET),
    )
  }

  if (opts.alphabets === "halfwidth") {
    value = value.replace(/[Ａ-Ｚａ-ｚ]/g, char =>
      String.fromCharCode(char.charCodeAt(0) - FULLWIDTH_ALPHABET_OFFSET),
    )
  }

  if (opts.hyphens === "ascii") {
    value = value.replace(HYPHEN_LIKE_CHARS, "-")
  } else if (opts.hyphens === "between-digits") {
    value = value.replace(HYPHEN_LIKE_CHARS, (char, index: number, input: string) =>
      DIGIT.test(input.charAt(index - 1)) && DIGIT.test(input.charAt(index + 1))
        ? "-"
        : char,
    )
  }

  if (opts.collapseSpaces) {
    const whitespace = opts.collapseSpaces === "horizontal" ? /[ \t]+/g : /[ \t\r\n]+/g
    value = value.replace(whitespace, " ")
  }

  if (opts.trim) {
    value = value.trim()
  }

  return value
}
