export type NormalizeJaInputOptions = {
  /** Trim leading and trailing whitespace after normalization. */
  trim?: boolean

  /** Collapse consecutive ASCII whitespace into a single space. */
  collapseSpaces?: boolean

  /** Convert full-width spaces to half-width spaces. */
  spaces?: "preserve" | "halfwidth"

  /** Convert full-width digits to half-width digits. */
  digits?: "preserve" | "halfwidth"

  /** Convert full-width Latin alphabets to half-width alphabets. */
  alphabets?: "preserve" | "halfwidth"

  /** Convert common Japanese hyphen-like characters to ASCII hyphen-minus. */
  hyphens?: "preserve" | "ascii"
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
  }

  if (opts.collapseSpaces) {
    value = value.replace(/[ \t\r\n]+/g, " ")
  }

  if (opts.trim) {
    value = value.trim()
  }

  return value
}
