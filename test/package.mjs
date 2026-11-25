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
import { jaInputPresets, normalizeJaInput } from "normalize-ja-input"

assert.equal(normalizeJaInput("ﾔﾏﾀﾞ"), "ﾔﾏﾀﾞ")
assert.equal(normalizeJaInput("ｽｰﾊﾟｰ", { katakana: "fullwidth", hyphens: "preserve" }), "スーパー")
assert.equal(normalizeJaInput("ｽｰﾊﾟｰ　ﾔﾏﾀﾞ", jaInputPresets.furigana), "スーパー ヤマダ")
assert.equal(
  normalizeJaInput("やまだ　ﾀﾛｳ", { ...jaInputPresets.furigana, kanaScript: "katakana" }),
  "ヤマダ タロウ",
)
assert.equal(normalizeJaInput("ヤマダ", { kanaScript: "hiragana" }), "やまだ")
`)
  runNode(["runtime.mjs"])

  writeFileSync(join(consumer, "types.mts"), `
import { jaInputPresets, normalizeJaInput, type NormalizeJaInputOptions } from "normalize-ja-input"

const options: NormalizeJaInputOptions = { katakana: "fullwidth" }
const normalized: string = normalizeJaInput("ﾊﾟﾝ", options)
// @ts-expect-error The public option only accepts "preserve" and "fullwidth".
normalizeJaInput("ﾊﾟﾝ", { katakana: "halfwidth" })
normalizeJaInput("０９０ー１２３４", jaInputPresets.phone)
normalizeJaInput("　東京都　港区　", { ...jaInputPresets.multilineAddress, trim: false })
normalizeJaInput("やまだ", { kanaScript: "preserve" })
normalizeJaInput("ヤマダ", { kanaScript: "hiragana" })
normalizeJaInput("ﾔﾏﾀﾞ", { ...jaInputPresets.furigana, kanaScript: "katakana" })
// @ts-expect-error Kana script accepts only the documented values.
normalizeJaInput("やまだ", { kanaScript: "fullwidth" })
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
