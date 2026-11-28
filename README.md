# normalize-ja-input

[English](README.en.md) · [ライブデモ](https://fusaihanabi.github.io/normalize-ja-input/) · [関連ライブラリ](#関連ライブラリ)

日本語フォーム入力の表記ゆれを整える、小さな TypeScript ユーティリティです。

```ts
import { normalizeJaInput } from "normalize-ja-input"

normalizeJaInput("　ＴＥＬ：０９０ー１２３４ー５６７８　")
// => "TEL：090-1234-5678"
```

## Features

- 全角数字を半角数字に変換
- 全角英字を半角英字に変換
- 全角スペースを半角スペースに変換
- ノーブレークスペースも必要に応じて半角スペースに変換
- 連続する空白を1つに正規化
- 日本語入力で混ざりがちなハイフン類を `-` に統一
- 数字間のハイフンだけを変換したり、改行を残して空白をまとめたりする設定に対応
- CRLF と単独の CR を必要に応じて LF に統一
- 複数行の入力で、各行の前後にあるスペースとタブを必要に応じて削除
- 整形結果と、実際に文字列を変えた設定名を取得
- `＠`、`．`、`＿`、`＋` を必要に応じて半角に変換
- 半角カタカナを必要に応じて全角に変換
- フリガナなどの文字種をひらがなかカタカナに統一
- かなと結合用の濁点・半濁点を必要に応じて1文字にまとめる
- 電話番号・フリガナ・メールアドレス・複数行の住所向けプリセット
- 依存ゼロ
- TypeScript対応

## Installation

```sh
npm install normalize-ja-input
```

ブラウザで直接使う場合は、ES モジュールを [unpkg](https://unpkg.com/normalize-ja-input/dist/index.js) または [jsDelivr](https://cdn.jsdelivr.net/npm/normalize-ja-input/dist/index.js) から読み込めます。[デモサイトの CDN セクション](https://fusaihanabi.github.io/normalize-ja-input/#cdn) に両方の使用例があります。

## CLI

PowerShell 7 では、引用符で囲んだ文字列をコマンドに渡せます。

```powershell
npx.cmd normalize-ja-input --preset phone --changes "　０９０ー１２３４　"
```

```json
{"value":"090-1234","changes":["spaces","digits","hyphens","trim"]}
```

引数を省略すると、標準入力から UTF-8 のテキストを読み込みます。複数行の住所や備考はパイプで渡せます。

```powershell
@'
東京都　港区
芝公園　１丁目
'@ | npx.cmd normalize-ja-input --preset multilineAddress
```

| 指定 | 動作 |
| --- | --- |
| `--preset <名前>` | `phone`、`furigana`、`email`、`multilineAddress` のいずれかを使います。省略時はライブラリの既定値を使います。 |
| `--changes` | 整形結果と変更した設定名を1行の JSON として出力し、末尾に改行を付けます。 |
| `--check` | 整形が必要な箇所を標準エラー出力に報告します。 |
| `--jsonl` | 標準入力から JSON を1行ずつ読み込み、各結果を1行ずつ出力します。 |
| `--field <項目名>` | `--jsonl` と併用し、各 JSON オブジェクトの指定した文字列項目を整形します。 |
| `--field-preset <項目名>=<プリセット>` | `--jsonl` と併用し、指定した項目をそれぞれのプリセットで整形します。複数回指定できます。 |
| `--help` | 使い方とプリセット一覧を表示して終了します。 |
| `--` | `-` で始まる文字列を引数として渡せます。 |

入力引数は1つまでで、`""` も指定できます。入力引数があるときはその値を使います。通常の出力は整形後の文字列で、コマンドによる末尾の改行の追加はありません。

PowerShell で空文字列を `npx.cmd` に渡す場合は、`--%` を使って空の引数を保持します。

```powershell
npx.cmd --% normalize-ja-input --changes ""
```

| 終了コード | 意味 |
| --- | --- |
| `0` | 整形やヘルプ表示が完了しました。検査では、空の入力または整形済みの入力です。 |
| `2` | オプション、引数、JSON Lines の入力に誤りがあります。引数を省略し、標準入力が端末につながっている場合も含みます。 |
| `1` | 入出力の処理に失敗しました。 |
| `3` | `--check` で有効な入力を最後まで検査し、整形が必要な箇所が見つかりました。 |

エラーは標準エラー出力に表示されます。

### JSON Lines で複数件を整形する

標準の `--jsonl` モードでは、UTF-8 の標準入力から1行に1つの JSON 文字列を読み込み、同じ設定で1件ずつ整形します。入力引数との併用はできません。入力の行区切りは `LF` または `CRLF` で、最終行の改行は省略できます。文字列の中にある改行は JSON の `\n` として渡します。

```powershell
@'
"東京都　港区\n芝公園　１丁目"
"大阪府　大阪市"
'@ | npx.cmd normalize-ja-input --jsonl --preset multilineAddress
```

```jsonl
"東京都 港区\n芝公園 1丁目"
"大阪府 大阪市"
```

通常は整形後の JSON 文字列を、`--changes` を指定すると `{ value, changes }` の JSON オブジェクトを返します。出力は入力順で、各行の末尾は `LF` です。

空の標準入力は0件として扱い、`""` は有効な1件として扱います。空行、文字列以外の JSON 値、不正な JSON、不正な UTF-8 があれば、標準エラー出力に1から数えた行番号と理由を表示し、終了コード `2` で停止します。それまでに出力した結果は残ります。

### JSON オブジェクトの指定項目を整形する

`--jsonl --field <項目名>` を指定すると、1行に1つの JSON オブジェクトを読み込み、そのトップレベルにある指定項目だけを整形します。項目名は完全一致で、たとえば `person.name` はドットを含む1つの項目名として扱います。

```powershell
@'
{"id":9007199254740993123456789,"furigana":"ﾔﾏﾀﾞ　ﾀﾛｳ","batch":1e+03}
'@ | npx.cmd normalize-ja-input --jsonl --field furigana --preset furigana
```

```jsonl
{"id":9007199254740993123456789,"furigana":"ヤマダ タロウ","batch":1e+03}
```

整形によって値が変わった場合だけ、その文字列の JSON 表記を書き換えます。大きな数値 ID、指数表記、ほかの項目のエスケープ、項目順、空白は元の表記を保ちます。`--changes` を併用すると、整形後のレコードを `value` に入れ、指定項目に効いた設定名を `changes` に入れます。

入力が JSON オブジェクト以外の場合や、指定項目がない、値が文字列以外、指定項目が重複している場合は、行番号と理由を標準エラー出力に表示し、終了コード `2` で停止します。それまでに出力した結果は残ります。

### 複数の項目に別々のプリセットを適用する

`--jsonl --field-preset <項目名>=<プリセット>` を項目ごとに指定します。最後の `=` で項目名とプリセットを分けるため、`team=name=furigana` は `team=name` というトップレベルの項目に `furigana` を適用します。

```powershell
@'
{"id":9007199254740993123456789,"batch":1e+03,"furigana":"ﾔﾏﾀﾞ　ﾀﾛｳ","phone":"０９０ー１２３４"}
'@ | npx.cmd normalize-ja-input --jsonl --field-preset furigana=furigana --field-preset phone=phone --changes
```

```jsonl
{"value":{"id":9007199254740993123456789,"batch":1e+03,"furigana":"ヤマダ タロウ","phone":"090-1234"},"changes":{"furigana":["spaces","katakana"],"phone":["digits","hyphens"]}}
```

通常は整形後のレコードを1行ずつ出力します。`--changes` を併用すると、`value` に整形後のレコード、`changes` に項目名ごとの変更一覧を返します。変化がなかった指定項目の一覧は `[]` です。大きな数値 ID や指数表記を含め、変更があった文字列以外の表記は保持します。

同じ項目の重複指定、未知のプリセット、`--field` または `--preset` との併用は使用エラーです。レコード内で指定した項目が欠けている、文字列以外である、または重複している場合は、行番号と項目名を表示して終了コード `2` で停止します。エラーの行は出力せず、それまでの結果は残ります。

### 整形が必要な箇所を調べる

`--check` は、既存の整形ルールを使って、入力の文字列値と整形後の値を比較します。検査中の標準出力は空です。整形が必要な箇所だけを標準エラー出力に報告します。

| 入力モード | 報告する内容 |
| --- | --- |
| 通常の1件入力 | 入力の整形が必要かどうか |
| `--jsonl` の文字列モード | 整形が必要な行番号 |
| `--jsonl --field` または `--field-preset` | 行番号と、値が変わる項目名 |

```powershell
@'
{"id":9007199254740993123456789,"phone":"０９０ー１２３４"}
{"id":9007199254740993123456790,"phone":"080-5678"}
'@ | npx.cmd normalize-ja-input --jsonl --field-preset phone=phone --check
```

```text
Line 1 needs normalization in field "phone".
```

この例の終了コードは `3` です。文字列値が同じなら JSON のエスケープ表記は判定に影響せず、指定対象外の数値 ID も判定に影響しません。`--changes` との併用は使用エラーです。

整形が必要な箇所を報告したあとも検査を続けます。途中に不正なレコードがあれば、行番号と理由を報告して `2` で停止します。先に出した診断は残ります。

## Usage

```ts
import { normalizeJaInput } from "normalize-ja-input"

normalizeJaInput("　山田　太郎　")
// => "山田 太郎"

normalizeJaInput("１２３４５")
// => "12345"

normalizeJaInput("ＡＢＣｘｙｚ")
// => "ABCxyz"

normalizeJaInput("090ー1234−5678")
// => "090-1234-5678"
```

## 公開 API

```ts
import {
  jaInputPresets,
  normalizeJaInput,
  type NormalizeJaInputOptions,
} from "normalize-ja-input"

const options: NormalizeJaInputOptions = { ...jaInputPresets.furigana, kanaScript: "katakana" }
normalizeJaInput("やまだ　ﾀﾛｳ", options)
// => "ヤマダ タロウ"
```

| エクスポート | 用途 |
| --- | --- |
| `normalizeJaInput(input, options?)` | 文字列を受け取り、整形後の文字列を返します。 |
| `normalizeJaInputWithChanges(input, options?)` | 整形後の文字列と、実際に変更を加えた設定名を返します。 |
| `NormalizeJaInputOptions` | 両関数の第2引数の型です。各項目は省略できます。 |
| `NormalizeJaInputResult` | `normalizeJaInputWithChanges` の戻り値の型です。 |
| `jaInputPresets` | 入力欄ごとの読み取り専用オプションです。 |

パッケージは ESM 形式で、TypeScript の型定義を同梱しています。

### 変更の内訳を取得する

```ts
import { jaInputPresets, normalizeJaInputWithChanges } from "normalize-ja-input"

normalizeJaInputWithChanges("　０９０ー１２３４　", jaInputPresets.phone)
// { value: "090-1234", changes: ["spaces", "digits", "hyphens", "trim"] }
```

`NormalizeJaInputResult` の `value` は、同じ入力と設定で `normalizeJaInput` を呼んだ結果と一致します。`changes` は `(keyof NormalizeJaInputOptions)[]` で、各処理の前後で文字列が変わった設定名を、最初に変更が起きた順に返します。有効な設定でも文字列が変わらなければ一覧に入りません。変更がなければ `[]` を返します。

`kanaMarks` が文字種変換の前後で両方効いた場合も、設定名は1回だけ入ります。たとえば `"わ\u3099"` をカタカナにそろえる場合は、`ワ` に変換してから濁点が結合されます。

```ts
normalizeJaInputWithChanges("わ\u3099", { kanaScript: "katakana", kanaMarks: "compose" })
// { value: "ヷ", changes: ["kanaScript", "kanaMarks"] }
```

## オプションの既定値と処理順

| 順序 | オプション | 既定値 |
| --- | --- | --- |
| 1 | [`spaces`](#spaces) | `"halfwidth"` |
| 2 | [`digits`](#digits) | `"halfwidth"` |
| 3 | [`alphabets`](#alphabets) | `"halfwidth"` |
| 4 | [`katakana`](#katakana) | `"preserve"` |
| 5 | [`kanaMarks`](#kanamarks) | `"preserve"` |
| 6 | [`kanaScript`](#kanascript) | `"preserve"` |
| 7 | `kanaMarks` の再適用 | — |
| 8 | [`hyphens`](#hyphens) | `"ascii"` |
| 9 | [`punctuation`](#punctuation) | `"preserve"` |
| 10 | [`lineEndings`](#lineendings) | `"preserve"` |
| 11 | [`trimLines`](#trimlines) | `false` |
| 12 | [`collapseSpaces`](#collapsespaces) | `true` |
| 13 | [`trim`](#trim) | `true` |

手順7は、濁点・半濁点の結合と文字種変換の両方を有効にした場合に実行します。

### `trim`

Type: `boolean`

前後の空白を削除します。

```ts
normalizeJaInput(" 山田 ")
// => "山田"
```

### `lineEndings`

Type: `"preserve" | "lf"`

`"lf"` は `\r\n` と単独の `\r` をそれぞれ `\n` ひとつに変換します。既存の `\n` は変換対象に含まれません。`"preserve"` はこの処理を省略します。

変換後に `collapseSpaces` を適用します。`"horizontal"` なら途中の改行や空行を残し、`true` なら改行も空白にまとめます。前後の改行も残す場合は `trim: false` を指定してください。

```ts
normalizeJaInput("東京都　港区\r\n\r\n芝公園　１丁目\r１０１号室", {
  ...jaInputPresets.multilineAddress,
  lineEndings: "lf",
})
// => "東京都 港区\n\n芝公園 1丁目\n101号室"
```

### `trimLines`

Type: `boolean`

`true` にすると、各行の先頭と末尾にある半角スペースとタブを削除します。行の区切りは `\r\n`・`\r`・`\n` で、空白だけの行は空行になります。全角スペースなども各行の前後から取り除くには、先に `spaces` で半角スペースへ変換します。ノーブレークスペースも対象にする場合は `spaces: "ascii"` を使います。

行のトリムは `lineEndings` の後、`collapseSpaces` の前に行います。途中の改行を残すには `collapseSpaces: "horizontal"` または `false` を使います。文字列の先頭・末尾にある改行も残す場合は `trim: false` を併用します。

単独の `\r` と `\n` の間に空白だけの行があると、空白の削除後に両者が隣り合い、`\r\n` として扱われます。この場合も空行を残すには `lineEndings: "lf"` を指定します。

```ts
normalizeJaInput("　東京都　港区　\r\n \t\r\n　芝公園　１丁目　", {
  ...jaInputPresets.multilineAddress,
  trimLines: true,
})
// => "東京都 港区\r\n\r\n芝公園 1丁目"
```

### `collapseSpaces`

Type: `boolean | "horizontal"`

`true` は半角スペース、タブ、改行の並びを半角スペース1つにします。単独のタブや改行も半角スペースになります。`"horizontal"` は半角スペースとタブだけをまとめ、途中の改行を残します。前後の改行も残すには `trim: false` を指定してください。`false` はこの処理を無効にします。

```ts
normalizeJaInput("山田   太郎")
// => "山田 太郎"

normalizeJaInput("東京都　　港区\n芝公園  １丁目", { collapseSpaces: "horizontal" })
// => "東京都 港区\n芝公園 1丁目"
```

### `spaces`

Type: `"preserve" | "halfwidth" | "ascii"`

| 値 | 半角スペースに変換する文字 |
| --- | --- |
| `"preserve"` | 幅変換を省略 |
| `"halfwidth"` | 全角スペース `U+3000` |
| `"ascii"` | 全角スペース `U+3000`、ノーブレークスペース `U+00A0`、幅の狭いノーブレークスペース `U+202F` |

空白の変換後に `collapseSpaces` を適用し、最後に `trim` を適用します。`collapseSpaces: false` なら並んだ空白の個数を保ちます。`spaces: "preserve"` でも `trim` が有効なら前後の空白を取り除きます。対象外の空白（たとえば文字列の途中にある `U+2007`）は保持します。

```ts
normalizeJaInput("山田　太郎")
// => "山田 太郎"

normalizeJaInput("山田\u00A0\u202F太郎", { spaces: "ascii" })
// => "山田 太郎"

normalizeJaInput("山田\u00A0\u202F太郎", { spaces: "ascii", collapseSpaces: false })
// => "山田  太郎"
```

### `digits`

Type: `"preserve" | "halfwidth"`

全角数字を半角数字にします。

```ts
normalizeJaInput("１２３")
// => "123"
```

### `alphabets`

Type: `"preserve" | "halfwidth"`

全角英字を半角英字にします。

```ts
normalizeJaInput("ＡＢＣｘｙｚ")
// => "ABCxyz"
```

### `katakana`

Type: `"preserve" | "fullwidth"`

`"fullwidth"` は `ﾔﾏﾀﾞ` を `ヤマダ` に、`ﾊﾟﾝ` を `パン` に変換します。濁点・半濁点が単独で現れる場合や、`ｱﾞ` のように直前の文字と1文字にまとまらない場合は、記号を半角のまま残します。半角の句読点や中点も保持します。

長音符はカタカナの変換後に `hyphens` の設定に従います。フリガナや商品名で長音符を残すには `hyphens: "preserve"` を併用します。

```ts
normalizeJaInput("　ｽｰﾊﾟｰ　ﾔﾏﾀﾞ　", {
  katakana: "fullwidth",
  hyphens: "preserve",
})
// => "スーパー ヤマダ"
```

### `kanaScript`

Type: `"preserve" | "hiragana" | "katakana"`

`"hiragana"` は全角カタカナをひらがなに、`"katakana"` はひらがなを全角カタカナにそろえます。`"preserve"` はかなの文字種をそのまま残します。

対象は `ぁ`〜`ゖ` と `ァ`〜`ヶ` の対応する文字、および繰り返し記号の `ゝ`・`ゞ` と `ヽ`・`ヾ` です。小書き文字や濁音・半濁音も変換します。`ヷ` など対応するひらがながない文字や、漢字・中点は保持します。濁点・半濁点がかな本体と別の文字で入力されている場合は、かな本体だけを変換し、記号を残します。

半角カタカナが混ざる場合は `katakana: "fullwidth"` を併用すると、全角化してから文字種をそろえます。長音符にはその後で `hyphens` の設定が適用されます。`jaInputPresets.furigana` には全角化と長音符の保持が含まれています。

```ts
import { jaInputPresets, normalizeJaInput } from "normalize-ja-input"

normalizeJaInput("やまだ　ﾀﾛｳ", { ...jaInputPresets.furigana, kanaScript: "katakana" })
// => "ヤマダ タロウ"

normalizeJaInput("ヤマダ　ﾀﾛｳ", { ...jaInputPresets.furigana, kanaScript: "hiragana" })
// => "やまだ たろう"
```

### `kanaMarks`

Type: `"preserve" | "compose"`

`"compose"` は、かなの直後にある結合用濁点（`U+3099`）または結合用半濁点（`U+309A`）を、対応する1文字にまとめます。単独の記号、1文字にまとまらない組み合わせ、独立した記号の `゛`・`゜` は保持します。半角の濁点・半濁点は `katakana` の設定で扱います。`"preserve"` はこの結合処理を省略します。

半角カタカナの全角化後、`kanaScript` による文字種の変換前に結合します。変換後に新しく結合できる組み合わせも1文字にまとめ、その後に `hyphens` を適用します。

```ts
normalizeJaInput("か\u3099く ハ\u309Aン", { kanaMarks: "compose" })
// => "がく パン"

normalizeJaInput("が か\u3099", { kanaMarks: "compose", kanaScript: "katakana" })
// => "ガ ガ"

normalizeJaInput("あ\u3099", { kanaMarks: "compose" })
// => "あ\u3099"
```

### `hyphens`

Type: `"preserve" | "ascii" | "between-digits"`

`"ascii"` は長音符 `ー` を含むハイフン類を ASCII の `-` に統一します。`"between-digits"` は対象の記号の直前と直後がどちらも半角または全角の数字の場合にだけ変換します。`"preserve"` はハイフン類をそのまま残します。

```ts
normalizeJaInput("090ー1234−5678")
// => "090-1234-5678"

normalizeJaInput("コーヒー")
// => "コ-ヒ-"

normalizeJaInput("コーヒー", { hyphens: "preserve" })
// => "コーヒー"

normalizeJaInput("コーヒー ０９０ー１２３４", { hyphens: "between-digits" })
// => "コーヒー 090-1234"

normalizeJaInput("０９０ー１２３４", { hyphens: "between-digits", digits: "preserve" })
// => "０９０-１２３４"
```

### `punctuation`

Type: `"preserve" | "ascii"`

`"ascii"` は `＠`、`．`、`＿`、`＋` をそれぞれ `@`、`.`、`_`、`+` にします。`"preserve"` ではこれらの文字をそのまま残します。ハイフン類の変換は `hyphens` で設定します。

```ts
normalizeJaInput("　ｔｅｓｔ＋１＠ｅｘａｍｐｌｅ．ｊｐ　", {
  punctuation: "ascii",
  hyphens: "preserve",
})
// => "test+1@example.jp"
```

## 入力欄ごとの設定例

名前付きエクスポートの `jaInputPresets` を `normalizeJaInput` の第2引数に渡せます。下表にないオプションには関数の既定値が使われます。

| プリセット | 上書きする設定 |
| --- | --- |
| `phone` | `hyphens: "between-digits"` |
| `furigana` | `katakana: "fullwidth"`、`hyphens: "preserve"` |
| `email` | `punctuation: "ascii"`、`hyphens: "preserve"`、`spaces: "preserve"`、`collapseSpaces: false` |
| `multilineAddress` | `collapseSpaces: "horizontal"`、`hyphens: "preserve"` |

| 入力欄 | プリセットまたはオプション | 入力 → 出力 |
| --- | --- | --- |
| 電話番号 | `jaInputPresets.phone` | `０９０ー１２３４` → `090-1234` |
| 氏名 | `{ hyphens: "preserve" }` | `メアリー　山田` → `メアリー 山田` |
| フリガナ | `jaInputPresets.furigana` | `ﾔﾏﾀﾞ ﾒｱﾘｰ` → `ヤマダ メアリー` |
| メールアドレス | `jaInputPresets.email` | `ａ＿１＠ｅｘａｍｐｌｅ．ｊｐ` → `a_1@example.jp` |
| 複数行の住所 | `jaInputPresets.multilineAddress` | `東京都　　港区\nメゾン青山　１０１` → `東京都 港区\nメゾン青山 101` |

`phone` は数字間のハイフン類をそろえます。`furigana` は半角カタカナを全角にし、長音符を残します。`email` は対象の全角記号を半角にし、前後の空白を取り除きます。途中の空白や改行、ハイフン類は保持します。`multilineAddress` は行内の空白をまとめつつ、途中の改行と建物名などの長音符を残します。

プリセットは読み取り専用です。個別の入力欄で設定を変更するには、スプレッド構文で取り出してから上書きします。

```ts
import { jaInputPresets, normalizeJaInput } from "normalize-ja-input"

normalizeJaInput("ｽｰﾊﾟｰ　ﾔﾏﾀﾞ", jaInputPresets.furigana)
// => "スーパー ヤマダ"

normalizeJaInput("Ａ　Ｂ＠ｅｘａｍｐｌｅ．ｊｐ", jaInputPresets.email)
// => "A　B@example.jp"

normalizeJaInput("\n東京都　　港区\n芝公園　１丁目\n", {
  ...jaInputPresets.multilineAddress,
  trim: false,
})
// => "\n東京都 港区\n芝公園 1丁目\n"

normalizeJaInput("東京都\u00A0港区\n芝公園\u202F１丁目", {
  ...jaInputPresets.multilineAddress,
  spaces: "ascii",
})
// => "東京都 港区\n芝公園 1丁目"
```

電話番号やメールアドレスの妥当性は、変換後にフォーム側で確認してください。

---

## Live Demo

- Demo → `https://fusaihanabi.github.io/normalize-ja-input`
- npm → `https://www.npmjs.com/package/normalize-ja-input`
- GitHub → `https://github.com/fusaihanabi/normalize-ja-input`
- Official → `https://dl.fusai-hanabi.com`

デモでは入力と出力のコードポイント数を確認できます。「Combining mark」の例で結合をオンにすると、見た目が同じ `がく` のコードポイント数が3から2になります。

「Mixed spaces」の例では、入力欄の下に3種類の空白がコードポイント付きで表示されます。「Space conversion」で「Fullwidth + no-break spaces」を選ぶと、3種類とも半角スペースに変換されます。

「Mixed line endings」の例を選ぶと、複数行住所のプリセットが適用され、入力と出力の改行コードが `\r\n`・`\r`・`\n` の表記で表示されます。「Line endings」を「Normalize to LF」に切り替えると、出力の改行が `\n` にそろいます。

出力欄の「変更した設定」に、実際に効いた設定名が並びます。「Padded address」の例で「trim each line」をオンにすると、行ごとの空白を取り除く `trimLines` と、入力全体の前後の改行を取り除く `trim` の両方を確認できます。途中の空行は出力に残ります。

デモを更新するときは `npm run build` で `dist/` と `docs/index.js` を生成し、GitHub Pages 用の `docs/index.js` をソースの変更と一緒にコミットします。

## 関連ライブラリ

日本語 IME の変換確定後に入力を正規化し、確定値の検証や用途別の処理に進めます。Fusai Hanabi OSS の各ライブラリは、必要な処理に合わせて組み合わせられます。

| ライブラリ | 用途 | デモ |
| --- | --- | --- |
| [ja-ime-utils](https://github.com/fusaihanabi/ja-ime-utils) | 日本語 IME の変換状態を追跡し、確定時の Enter とフォームの送信を区別 | [ライブデモ](https://fusaihanabi.github.io/ja-ime-utils/) |
| [ja-input-mask](https://github.com/fusaihanabi/ja-input-mask) | 電話番号や郵便番号などを入力中に整形し、貼り付けやカーソル操作にも対応 | [ライブデモ](https://fusaihanabi.github.io/ja-input-mask/) |
| [ja-form-validators](https://github.com/fusaihanabi/ja-form-validators) | 正規化後の郵便番号、電話番号、フリガナなどを検証 | [ライブデモ](https://fusaihanabi.github.io/ja-form-validators/) |
| [ja-char-check](https://github.com/fusaihanabi/ja-char-check) | 保存や外部連携の前に、文字集合・文字コードの互換性やバイト数を検査 | [ライブデモ](https://fusaihanabi.github.io/ja-char-check/) |
| [tiny-ja-date](https://github.com/fusaihanabi/tiny-ja-date) | 日本語の日付表示、暦日・営業日の計算 | [ライブデモ](https://fusaihanabi.github.io/tiny-ja-date/) |
| [tiny-ja-money](https://github.com/fusaihanabi/tiny-ja-money) | 円単位の金額を読み取り・整形し、消費税や按分を計算 | [ライブデモ](https://fusaihanabi.github.io/tiny-ja-money/) |
| [ja-zengin-utils](https://github.com/fusaihanabi/ja-zengin-utils) | 全銀カナと総合振込の120バイト固定長ファイルを処理 | [ライブデモ](https://fusaihanabi.github.io/ja-zengin-utils/) |

[Fusai Hanabi OSS 公式サイト](https://dl.fusai-hanabi.com/)

## リリース確認

GitHub Actions では、Windows と Ubuntu で Node.js 22・24・26 を検証します。[Release checks](.github/workflows/check.yml)

1.0.0 のローカル検証では、Windows の Node.js 22.22.0・24.22.3・26.13.1 で、型チェック、単体テスト、配布テスト、公開ドライランを確認しました。

手元でも同じ確認を実行できます。

```sh
npm ci
npm run typecheck
npm run test:run
npm run test:package
npm publish --dry-run --offline
```

`test:package` は `npm pack` で作ったアーカイブを一時ディレクトリへインストールし、パッケージ名からの ESM の読み込み、型解決、CLI の出力と終了コードを確認します。JSON Lines モードでは、入力の途中でも結果を受け取れることと、不正な行で停止しても直前までの結果が残ることを確認します。`--field` と `--field-preset` のテストでは、出力を再解析せず、大きな数値 ID や指数表記がそのまま残ることを確認します。`--check` のテストでは、標準出力が空であること、該当箇所の診断、検査結果の終了コードを確認します。ドライランでは、`npm publish` の公開前処理で配布テストまで完了することを確認します。

ブラウザでデモを確認するときは、プリセットから `Custom` への切り替え、空白のコードポイント表示、混在する改行の LF への変換を試します。コピーした出力を入力欄に貼り付け、途中の空行も含めて元の出力と一致することを確認します。

---

## 対象範囲

このライブラリは、電話番号、郵便番号、住所、氏名などの入力に含まれる表記ゆれを、検証や保存の前に整えます。電話番号や郵便番号などの形式を検証するには、正規化後の値を [ja-form-validators](https://github.com/fusaihanabi/ja-form-validators) に渡せます。

## License

MIT
