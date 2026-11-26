import { execFileSync } from "node:child_process"
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const npm = process.env.npm_execpath
if (!npm) {
  throw new Error("Run this check with npm run test:package")
}

const root = realpathSync(fileURLToPath(new URL("..", import.meta.url)))
const tsc = createRequire(import.meta.url).resolve("typescript/bin/tsc")
const consumer = mkdtempSync(join(root, ".test-package-"))
const cache = join(consumer, "npm-cache")
const runNode = (args, cwd = consumer) =>
  execFileSync(process.execPath, args, { cwd, encoding: "utf8" })

try {
  // A publish dry run still needs real artifacts inside this temporary consumer.
  const [{ filename }] = JSON.parse(runNode(
    [
      npm, "pack", "--dry-run=false", "--ignore-scripts", "--json",
      "--pack-destination", consumer, "--cache", cache,
    ],
    root,
  ))

  writeFileSync(join(consumer, "package.json"), JSON.stringify({ private: true }))
  runNode([
    npm, "install", "--dry-run=false", "--ignore-scripts", "--offline", "--no-audit", "--no-fund",
    "--no-package-lock", "--cache", cache, join(consumer, filename),
  ])

  writeFileSync(join(consumer, "runtime.mjs"), `
import assert from "node:assert/strict"
import { jaInputPresets, normalizeJaInput, normalizeJaInputWithChanges } from "normalize-ja-input"

assert.equal(normalizeJaInput("ﾔﾏﾀﾞ"), "ﾔﾏﾀﾞ")
assert.equal(normalizeJaInput("コーヒー"), "コ-ヒ-")
assert.equal(normalizeJaInput("０９０ー１２３４", jaInputPresets.phone), "090-1234")
assert.equal(normalizeJaInput("Ａ　Ｂ＠ｅｘａｍｐｌｅ．ｊｐ", jaInputPresets.email), "A　B@example.jp")
assert.equal(normalizeJaInput("ｽｰﾊﾟｰ", { katakana: "fullwidth", hyphens: "preserve" }), "スーパー")
assert.equal(normalizeJaInput("ｽｰﾊﾟｰ　ﾔﾏﾀﾞ", jaInputPresets.furigana), "スーパー ヤマダ")
assert.equal(
  normalizeJaInput("やまだ　ﾀﾛｳ", { ...jaInputPresets.furigana, kanaScript: "katakana" }),
  "ヤマダ タロウ",
)
assert.equal(normalizeJaInput("ヤマダ", { kanaScript: "hiragana" }), "やまだ")
assert.equal(normalizeJaInput("か\\u3099く", { kanaMarks: "compose" }), "がく")
assert.equal(
  normalizeJaInput("わ\\u3099", { kanaScript: "katakana", kanaMarks: "compose" }),
  "ヷ",
)
assert.equal(normalizeJaInput("山田\\u00a0\\u202f太郎", { spaces: "ascii" }), "山田 太郎")
assert.equal(
  normalizeJaInput("港区\\r\\n\\r芝公園\\n受付", {
    ...jaInputPresets.multilineAddress,
    lineEndings: "lf",
  }),
  "港区\\n\\n芝公園\\n受付",
)
assert.equal(
  normalizeJaInput(" 東京都  港区 \\r\\n \\t\\r\\n 芝公園 １丁目 ", {
    ...jaInputPresets.multilineAddress,
    trimLines: true,
  }),
  "東京都 港区\\r\\n\\r\\n芝公園 1丁目",
)
assert.deepEqual(normalizeJaInputWithChanges("　０９０ー１２３４　", jaInputPresets.phone), {
  value: "090-1234",
  changes: ["spaces", "digits", "hyphens", "trim"],
})
`)
  runNode(["runtime.mjs"])

  writeFileSync(join(consumer, "types.mts"), `
import {
  jaInputPresets, normalizeJaInput, normalizeJaInputWithChanges,
  type NormalizeJaInputOptions, type NormalizeJaInputResult,
} from "normalize-ja-input"

const options: NormalizeJaInputOptions = { katakana: "fullwidth" }
const normalized: string = normalizeJaInput("ﾊﾟﾝ", options)
const result: NormalizeJaInputResult = normalizeJaInputWithChanges("ﾊﾟﾝ", options)
const value: string = result.value
const changes: (keyof NormalizeJaInputOptions)[] = result.changes
// @ts-expect-error Changes must name normalization options.
changes.push("unknown")
// @ts-expect-error The public option only accepts "preserve" and "fullwidth".
normalizeJaInput("ﾊﾟﾝ", { katakana: "halfwidth" })
normalizeJaInput("０９０ー１２３４", jaInputPresets.phone)
normalizeJaInput("　東京都　港区　", { ...jaInputPresets.multilineAddress, trim: false })
normalizeJaInput("やまだ", { kanaScript: "preserve" })
normalizeJaInput("ヤマダ", { kanaScript: "hiragana" })
normalizeJaInput("ﾔﾏﾀﾞ", { ...jaInputPresets.furigana, kanaScript: "katakana" })
// @ts-expect-error Kana script accepts only the documented values.
normalizeJaInput("やまだ", { kanaScript: "fullwidth" })
normalizeJaInput("か", { kanaMarks: "preserve" })
normalizeJaInput("か", { kanaMarks: "compose" })
// @ts-expect-error Kana marks accept only the documented values.
normalizeJaInput("か", { kanaMarks: "nfc" })
normalizeJaInput("山田", { spaces: "preserve" })
normalizeJaInput("山田", { spaces: "halfwidth" })
normalizeJaInput("山田", { spaces: "ascii" })
// @ts-expect-error Space conversion accepts only the documented values.
normalizeJaInput("山田", { spaces: "fullwidth" })
normalizeJaInput("山田", { lineEndings: "preserve" })
normalizeJaInput("山田", { lineEndings: "lf" })
// @ts-expect-error Line ending conversion accepts only the documented values.
normalizeJaInput("山田", { lineEndings: "crlf" })
normalizeJaInput("山田", { trimLines: true })
normalizeJaInput("山田", { trimLines: false })
// @ts-expect-error Line trimming accepts a boolean.
normalizeJaInput("山田", { trimLines: "true" })
// @ts-expect-error The preset registry is read-only.
jaInputPresets.phone = jaInputPresets.phone
// @ts-expect-error The preset options are read-only.
jaInputPresets.phone.hyphens = "between-digits"
`)
  runNode([
    tsc, "--noEmit", "--strict", "--module", "NodeNext",
    "--typeRoots", "./node_modules/@types", "types.mts",
  ])
  console.log("Packed package passed runtime import and public type checks.")
} finally {
  const resolved = realpathSync(consumer)
  if (resolved !== consumer || dirname(resolved) !== root) {
    throw new Error(`Unexpected package test directory: ${resolved}`)
  }
  rmSync(resolved, { recursive: true })
}
