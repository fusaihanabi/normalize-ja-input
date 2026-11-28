# normalize-ja-input

[日本語](README.md) · [Live demo](https://fusaihanabi.github.io/normalize-ja-input/) · [Related libraries](#related-libraries)

A small, dependency-free TypeScript utility for normalizing Japanese form input in Node.js and browsers. It handles variations in character width, spaces, hyphens, kana, and line endings. Use it to prepare input for validation or storage.

```ts
import { normalizeJaInput } from "normalize-ja-input"

normalizeJaInput("　ＴＥＬ：０９０ー１２３４ー５６７８　")
// => "TEL：090-1234-5678"
```

## Install

```sh
npm install normalize-ja-input
```

The package ships as ESM with TypeScript declarations. Browsers can load it directly from [unpkg](https://unpkg.com/normalize-ja-input/dist/index.js) or [jsDelivr](https://cdn.jsdelivr.net/npm/normalize-ja-input/dist/index.js). The live demo includes an import example for each provider. [CDN examples](https://fusaihanabi.github.io/normalize-ja-input/#cdn)

## API

| Export | Purpose |
| --- | --- |
| `normalizeJaInput(input, options?)` | Returns the normalized string. |
| `normalizeJaInputWithChanges(input, options?)` | Returns the normalized string and the option names that changed it. |
| `NormalizeJaInputOptions` | Type of the optional second argument to both functions. All fields are optional. |
| `NormalizeJaInputResult` | Return type of `normalizeJaInputWithChanges`. |
| `jaInputPresets` | Read-only option overrides for common form fields. |

```ts
import {
  jaInputPresets,
  normalizeJaInputWithChanges,
  type NormalizeJaInputOptions,
} from "normalize-ja-input"

const options: NormalizeJaInputOptions = { ...jaInputPresets.furigana, kanaScript: "katakana" }

normalizeJaInputWithChanges("やまだ　ﾀﾛｳ", options)
// => { value: "ヤマダ タロウ", changes: ["spaces", "katakana", "kanaScript"] }
```

`value` matches the result of `normalizeJaInput` with the same input and options. The `changes` array lists the options in the order they first changed the string. An option appears at most once, including when `kanaMarks` changes the string on both passes. An unchanged input returns `changes: []`.

### Options and processing order

| Step | Option | Default | Other values |
| --- | --- | --- | --- |
| 1 | `spaces` | `"halfwidth"` | `"preserve"`, `"ascii"` |
| 2 | `digits` | `"halfwidth"` | `"preserve"` |
| 3 | `alphabets` | `"halfwidth"` | `"preserve"` |
| 4 | `katakana` | `"preserve"` | `"fullwidth"` |
| 5 | `kanaMarks` | `"preserve"` | `"compose"` |
| 6 | `kanaScript` | `"preserve"` | `"hiragana"`, `"katakana"` |
| 7 | Reapply `kanaMarks` | — | Runs when composition and script conversion are both enabled. |
| 8 | `hyphens` | `"ascii"` | `"preserve"`, `"between-digits"` |
| 9 | `punctuation` | `"preserve"` | `"ascii"` |
| 10 | `lineEndings` | `"preserve"` | `"lf"` |
| 11 | `trimLines` | `false` | `true` |
| 12 | `collapseSpaces` | `true` | `false`, `"horizontal"` |
| 13 | `trim` | `true` | `false` |

#### Character width and hyphens

- `spaces: "halfwidth"` converts the ideographic space (`U+3000`) to an ASCII space. `"ascii"` also converts the no-break space (`U+00A0`) and narrow no-break space (`U+202F`). `"preserve"` skips width conversion. Interior spaces such as `U+2007` are preserved.
- `digits: "halfwidth"` and `alphabets: "halfwidth"` convert fullwidth digits and Latin letters to ASCII. Use `"preserve"` to keep their original widths.
- `hyphens: "ascii"` converts supported hyphen variants and the prolonged sound mark `ー` to `-`. `"between-digits"` converts a supported character only when the immediate neighbors are both digits. It recognizes fullwidth and ASCII digits. `"preserve"` keeps the original marks.
- `punctuation: "ascii"` converts `＠`, `．`, `＿`, and `＋` to `@`, `.`, `_`, and `+`. Hyphen conversion has its own option.

```ts
normalizeJaInput("コーヒー　０９０ー１２３４", { hyphens: "between-digits" })
// => "コーヒー 090-1234"
```

#### Kana

- `katakana: "fullwidth"` converts halfwidth katakana and supported voiced or semi-voiced combinations. Standalone marks, marks that cannot combine with their preceding character, and halfwidth punctuation such as the middle dot are preserved. Use `hyphens: "preserve"` to keep prolonged sound marks after conversion.
- `kanaScript: "hiragana"` converts fullwidth katakana to hiragana. `"katakana"` converts hiragana to fullwidth katakana. The conversion covers corresponding kana from `ぁ` through `ゖ` and `ァ` through `ヶ`, along with iteration marks. Characters with no equivalent, such as `ヷ` when converting to hiragana, are preserved. Enable `katakana: "fullwidth"` to include halfwidth katakana.
- `kanaMarks: "compose"` combines kana followed by a combining voiced mark (`U+3099`) or semi-voiced mark (`U+309A`) when a single-character form exists. Standalone and spacing marks are preserved. Halfwidth marks follow the `katakana` option. Script conversion can create a new pair for the second composition pass.

```ts
normalizeJaInput("か\u3099く ハ\u309Aン", { kanaMarks: "compose" })
// => "がく パン"

normalizeJaInputWithChanges("わ\u3099", { kanaScript: "katakana", kanaMarks: "compose" })
// => { value: "ヷ", changes: ["kanaScript", "kanaMarks"] }
```

#### Whitespace and line endings

- `lineEndings: "lf"` converts CRLF (`\r\n`) and standalone CR (`\r`) to LF (`\n`).
- `trimLines: true` strips leading and trailing ASCII spaces and tabs from each line. It recognizes CRLF, CR, and LF. Set `spaces` first to include fullwidth or no-break spaces. Whitespace-only lines become empty lines. If a whitespace-only line separates a standalone CR and LF, use `lineEndings: "lf"` to keep the empty line after trimming.
- `collapseSpaces: true` collapses runs of ASCII spaces, tabs, and line endings into one ASCII space. `"horizontal"` collapses spaces and tabs while preserving interior line endings. `false` skips collapsing.
- `trim: true` removes whitespace at the start and end of the whole string. Use `trim: false` to keep leading and trailing line endings when collapsing is `"horizontal"` or disabled.

```ts
normalizeJaInput("　東京都　港区　\r\n \t\r\n　芝公園　１丁目　", {
  ...jaInputPresets.multilineAddress,
  lineEndings: "lf",
  trimLines: true,
})
// => "東京都 港区\n\n芝公園 1丁目"
```

### Presets

Pass a preset as the second argument. Any option omitted from the preset uses the library default. Spread a preset into a new object to override individual settings.

| Preset | Overrides | Example input → output |
| --- | --- | --- |
| `phone` | `hyphens: "between-digits"` | `０９０ー１２３４` → `090-1234` |
| `furigana` | `katakana: "fullwidth"`, `hyphens: "preserve"` | `ﾔﾏﾀﾞ ﾒｱﾘｰ` → `ヤマダ メアリー` |
| `email` | `punctuation: "ascii"`, `hyphens: "preserve"`, `spaces: "preserve"`, `collapseSpaces: false` | `ａ＿１＠ｅｘａｍｐｌｅ．ｊｐ` → `a_1@example.jp` |
| `multilineAddress` | `collapseSpaces: "horizontal"`, `hyphens: "preserve"` | `東京都　　港区\nメゾン青山　１０１` → `東京都 港区\nメゾン青山 101` |

For names, consider `{ hyphens: "preserve" }` to keep prolonged sound marks. Run phone number, postal code, and other field validation after normalization.

## CLI

Run the CLI with `npx normalize-ja-input` on macOS or Linux, or `npx.cmd normalize-ja-input` in PowerShell. The examples below use PowerShell 7.

```powershell
npx.cmd normalize-ja-input --preset phone --changes "　０９０ー１２３４　"
```

```json
{"value":"090-1234","changes":["spaces","digits","hyphens","trim"]}
```

Pass one string argument or pipe UTF-8 text to standard input. For an empty string argument in PowerShell, use `npx.cmd --% normalize-ja-input --changes ""`. Regular text output contains the normalized string without an added newline.

```powershell
@'
東京都　港区
芝公園　１丁目
'@ | npx.cmd normalize-ja-input --preset multilineAddress
```

| Flag | Behavior |
| --- | --- |
| `--preset <name>` | Applies `phone`, `furigana`, `email`, or `multilineAddress`. Omitting it uses the library defaults. |
| `--changes` | Writes the normalized value and change information as JSON followed by LF. |
| `--check` | Reports where normalization is needed through standard error. |
| `--jsonl` | Reads and writes one JSON value per line. |
| `--field <name>` | With `--jsonl`, normalizes the named string field of each JSON object. |
| `--field-preset <name>=<preset>` | With `--jsonl`, uses a field-specific preset. Repeat for multiple fields. |
| `--help` | Shows usage and available presets. |
| `--` | Allows a text argument beginning with `-`. |

| Exit code | Meaning |
| --- | --- |
| `0` | Normalization or help completed, or check mode found no changes. |
| `1` | An input or output operation failed. |
| `2` | Invalid options, arguments, or JSON Lines input, or standard input is a terminal and no text argument was supplied. |
| `3` | Check mode finished reading valid input and found text that needs normalization. |

### JSON Lines

`--jsonl` reads UTF-8 from standard input. Each line contains one JSON string by default. Input lines can end with LF or CRLF, and the final newline is optional. Standard output preserves input order and ends each result with LF. Use `--changes` to emit `{ value, changes }` objects in place of plain JSON strings.

```powershell
@'
"東京都　港区\n芝公園　１丁目"
"大阪府　大阪市"
'@ | npx.cmd normalize-ja-input --jsonl --preset multilineAddress
```

Empty standard input processes zero records, and `""` is a valid record. A blank line, invalid UTF-8, invalid JSON, or an unexpected value type stops processing with a one-based line number and a reason on standard error. The exit code is `2`, and earlier results remain available. JSON Lines mode takes its input exclusively from standard input.

### JSON object fields

Use `--jsonl --field <name>` to normalize a top-level string field with the default options or the selected `--preset`. Use `--jsonl --field-preset <name>=<preset>` to assign separate presets to multiple fields. Field names match literally, including dots, and `--field-preset` splits at the last `=`. A missing, duplicated, or non-string target field causes a line-numbered error. Duplicate flag targets, unknown presets, or combining `--field-preset` with `--field` or `--preset` are usage errors.

```powershell
@'
{"id":9007199254740993123456789,"batch":1e+03,"furigana":"ﾔﾏﾀﾞ　ﾀﾛｳ","phone":"０９０ー１２３４"}
'@ | npx.cmd normalize-ja-input --jsonl --field-preset furigana=furigana --field-preset phone=phone --changes
```

```jsonl
{"value":{"id":9007199254740993123456789,"batch":1e+03,"furigana":"ヤマダ タロウ","phone":"090-1234"},"changes":{"furigana":["spaces","katakana"],"phone":["digits","hyphens"]}}
```

Only changed string values are rewritten. Large numeric IDs, exponent notation, property order, whitespace, and the spelling of other JSON values are preserved. With `--field --changes`, `changes` is the selected field's array of option names. With `--field-preset --changes`, it maps field names to arrays, using `[]` for unchanged fields.

### Check mode

`--check` compares each string value with its normalized form. It leaves standard output empty and reports affected input on standard error. Reports include line numbers in JSON Lines mode and field names when checking object fields. The comparison uses decoded strings, so equivalent JSON escape spellings give the same result. Check mode continues after findings, stops on invalid input with exit code `2`, and preserves earlier diagnostics. Use check mode independently of `--changes`.

```powershell
@'
{"phone":"０９０ー１２３４"}
{"phone":"080-5678"}
'@ | npx.cmd normalize-ja-input --jsonl --field-preset phone=phone --check
```

```text
Line 1 needs normalization in field "phone".
```

This example exits with code `3`.

## Live demo

- The **Combining mark** example shows how the code-point count changes from three to two when the combining mark in `がく` is composed.
- **Mixed spaces** labels three types of spaces with their code points. Select **Fullwidth + no-break spaces** to convert all three to ASCII spaces.
- **Mixed line endings** selects the multiline address preset and displays CRLF, CR, and LF as `\r\n`, `\r`, and `\n`. Select **Normalize to LF** to standardize the output.
- In **Padded address**, turn on **trim each line** to see both `trimLines` and `trim` in the change list. The output retains the interior blank line.

[Open the live demo](https://fusaihanabi.github.io/normalize-ja-input/) · [npm package](https://www.npmjs.com/package/normalize-ja-input)

## Related libraries

Normalize input after Japanese IME composition finishes, then validate the completed value or pass it to the library that handles your field or file format.

| Library | Purpose | Demo |
| --- | --- | --- |
| [ja-ime-utils](https://github.com/fusaihanabi/ja-ime-utils) | Track Japanese IME composition and distinguish confirmation from form submission. | [Live demo](https://fusaihanabi.github.io/ja-ime-utils/) |
| [ja-input-mask](https://github.com/fusaihanabi/ja-input-mask) | Format phone numbers and postal codes while the user types, including pasting and caret handling. | [Live demo](https://fusaihanabi.github.io/ja-input-mask/) |
| [ja-form-validators](https://github.com/fusaihanabi/ja-form-validators) | Validate normalized postal codes, phone numbers, and furigana. | [Live demo](https://fusaihanabi.github.io/ja-form-validators/) |
| [ja-char-check](https://github.com/fusaihanabi/ja-char-check) | Check character sets, encoding compatibility, and byte counts before storage or data exchange. | [Live demo](https://fusaihanabi.github.io/ja-char-check/) |
| [tiny-ja-date](https://github.com/fusaihanabi/tiny-ja-date) | Format dates for Japanese interfaces and calculate calendar or business days. | [Live demo](https://fusaihanabi.github.io/tiny-ja-date/) |
| [tiny-ja-money](https://github.com/fusaihanabi/tiny-ja-money) | Parse and format whole yen amounts, calculate consumption tax, and allocate amounts. | [Live demo](https://fusaihanabi.github.io/tiny-ja-money/) |
| [ja-zengin-utils](https://github.com/fusaihanabi/ja-zengin-utils) | Process Zengin kana and 120-byte fixed-width bulk transfer files. | [Live demo](https://fusaihanabi.github.io/ja-zengin-utils/) |

[Fusai Hanabi OSS](https://dl.fusai-hanabi.com/)

## Development

GitHub Actions runs release checks on Windows and Ubuntu with Node.js 22, 24, and 26. [Release checks](.github/workflows/check.yml)

```sh
npm ci
npm run typecheck
npm run test:run
npm run test:package
npm publish --dry-run --offline
```

The package test installs an archive created by `npm pack` in a temporary directory and checks ESM imports by package name, TypeScript declarations, and CLI behavior. The publish dry run also runs the unit and package tests.

`npm run build` generates `dist/` and `docs/index.js`. Include updates to `docs/index.js` with source changes for GitHub Pages. To check the demo locally, serve `docs/` over HTTP and try the presets, space labels, line-ending options, and copy button.

## License

MIT
