# normalize-ja-input

Tiny TypeScript utility for normalizing Japanese form input.

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

## Options

```ts
normalizeJaInput(input, {
  trim: true,
  lineEndings: "preserve",
  collapseSpaces: true,
  spaces: "halfwidth",
  digits: "halfwidth",
  alphabets: "halfwidth",
  katakana: "preserve",
  kanaScript: "preserve",
  kanaMarks: "preserve",
  hyphens: "ascii",
  punctuation: "preserve",
})
```

### `trim`

Type: `boolean`  
Default: `true`

前後の空白を削除します。

```ts
normalizeJaInput(" 山田 ")
// => "山田"
```

### `lineEndings`

Type: `"preserve" | "lf"`

Default: `"preserve"`

`"lf"` は `\r\n` と単独の `\r` をそれぞれ `\n` ひとつに変換します。既存の `\n` は変換対象に含まれません。`"preserve"` はこの処理を省略します。

変換後に `collapseSpaces` を適用します。`"horizontal"` なら途中の改行や空行を残し、`true` なら改行も空白にまとめます。前後の改行も残す場合は `trim: false` を指定してください。

```ts
normalizeJaInput("東京都　港区\r\n\r\n芝公園　１丁目\r１０１号室", {
  ...jaInputPresets.multilineAddress,
  lineEndings: "lf",
})
// => "東京都 港区\n\n芝公園 1丁目\n101号室"
```

### `collapseSpaces`

Type: `boolean | "horizontal"`

Default: `true`

`true` は半角スペース、タブ、改行の並びを半角スペース1つにします。単独のタブや改行も半角スペースになります。`"horizontal"` は半角スペースとタブだけをまとめ、途中の改行を残します。前後の改行も残すには `trim: false` を指定してください。`false` はこの処理を無効にします。

```ts
normalizeJaInput("山田   太郎")
// => "山田 太郎"

normalizeJaInput("東京都　　港区\n芝公園  １丁目", { collapseSpaces: "horizontal" })
// => "東京都 港区\n芝公園 1丁目"
```

### `spaces`

Type: `"preserve" | "halfwidth" | "ascii"`

Default: `"halfwidth"`

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
Default: `"halfwidth"`

全角数字を半角数字にします。

```ts
normalizeJaInput("１２３")
// => "123"
```

### `alphabets`

Type: `"preserve" | "halfwidth"`  
Default: `"halfwidth"`

全角英字を半角英字にします。

```ts
normalizeJaInput("ＡＢＣｘｙｚ")
// => "ABCxyz"
```

### `katakana`

Type: `"preserve" | "fullwidth"`

Default: `"preserve"`

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

Default: `"preserve"`

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

Default: `"preserve"`

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

Default: `"ascii"`

`"ascii"` は長音符 `ー` を含むハイフン類を ASCII の `-` に統一します。`"between-digits"` は対象の記号の直前と直後がどちらも半角または全角の数字の場合にだけ変換します。`"preserve"` はハイフン類をそのまま残します。

```ts
normalizeJaInput("090ー1234−5678")
// => "090-1234-5678"

normalizeJaInput("コーヒー ０９０ー１２３４", { hyphens: "between-digits" })
// => "コーヒー 090-1234"

normalizeJaInput("０９０ー１２３４", { hyphens: "between-digits", digits: "preserve" })
// => "０９０-１２３４"
```

### `punctuation`

Type: `"preserve" | "ascii"`

Default: `"preserve"`

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

デモを更新するときは `npm run build` で `dist/` と `docs/index.js` を生成し、GitHub Pages 用の `docs/index.js` をソースの変更と一緒にコミットします。

公開前の確認には `npm run test:package` を使います。ビルド後に `npm pack` のアーカイブを一時ディレクトリへインストールし、公開 API の読み込みと型解決を確認します。`npm publish` の公開前処理でも、この確認と単体テストが実行されます。

`npm publish --dry-run --offline` も別途実行し、公開前処理がドライランでも配布テストを完了できることを確認します。

---

## What this library does not do

This library intentionally does not validate Japanese phone numbers, postal codes, addresses, or names.

It only normalizes common input variations before validation or storage.

## License

MIT
