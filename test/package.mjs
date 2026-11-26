import assert from "node:assert/strict"
import { execFileSync, spawnSync } from "node:child_process"
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

function runCli(args, input = "") {
  const options = { cwd: consumer, input, encoding: "utf8" }
  if (process.platform === "win32") {
    // cmd.exe runs the npm shim with the fixed arguments used by these tests.
    const shim = '".\\node_modules\\.bin\\normalize-ja-input.cmd"'
    const command = [shim, ...args.map(arg => `"${arg}"`)].join(" ")
    return spawnSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", `"${command}"`], {
      ...options,
      windowsVerbatimArguments: true,
    })
  }
  return spawnSync(join(consumer, "node_modules", ".bin", "normalize-ja-input"), args, options)
}

function expectCliOutput(args, output, input) {
  const result = runCli(args, input)
  assert.ifError(result.error)
  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stderr, "")
  assert.equal(result.stdout, output)
}

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

  expectCliOutput(["　ＡＢＣ１２３　"], "ABC123")
  expectCliOutput(
    ["--preset", "multilineAddress"],
    "東京都 港区\r\n\r\n芝公園 1丁目",
    "東京都　港区\r\n\r\n芝公園　１丁目\r\n",
  )
  expectCliOutput(
    ["--preset", "phone", "--changes", "　０９０ー１２３４　"],
    '{"value":"090-1234","changes":["spaces","digits","hyphens","trim"]}\n',
    "ignored standard input",
  )
  expectCliOutput(["--changes", ""], '{"value":"","changes":[]}\n', "ignored standard input")
  expectCliOutput(["--changes"], '{"value":"","changes":[]}\n')
  expectCliOutput(["--", "--help"], "--help")

  const help = runCli(["--help"])
  assert.ifError(help.error)
  assert.equal(help.status, 0, help.stderr)
  assert.equal(help.stderr, "")
  assert.match(help.stdout, /normalize-ja-input \[--preset <name>\]/)
  assert.match(help.stdout, /phone, furigana, email, multilineAddress/)

  for (const [args, message] of [
    [["--unknown"], /Unknown option/],
    [["--preset"], /--preset/],
    [["--preset", "constructor", "入力"], /Unknown preset "constructor"/],
    [["先頭", "末尾"], /Expected at most one text argument/],
  ]) {
    const failure = runCli(args)
    assert.ifError(failure.error)
    assert.equal(failure.status, 2, failure.stderr)
    assert.equal(failure.stdout, "")
    assert.match(failure.stderr, message)
  }

  console.log("Packed package passed runtime import, public type, and CLI checks.")
} finally {
  const resolved = realpathSync(consumer)
  if (resolved !== consumer || dirname(resolved) !== root) {
    throw new Error(`Unexpected package test directory: ${resolved}`)
  }
  rmSync(resolved, { recursive: true })
}
