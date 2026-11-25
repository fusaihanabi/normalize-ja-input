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
- 連続する空白を1つに正規化
- 日本語入力で混ざりがちなハイフン類を `-` に統一
- 数字間のハイフンだけを変換したり、改行を残して空白をまとめたりする設定に対応
- `＠`、`．`、`＿`、`＋` を必要に応じて半角に変換
- 半角カタカナを必要に応じて全角に変換
- フリガナなどの文字種をひらがなかカタカナに統一
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
  collapseSpaces: true,
  spaces: "halfwidth",
  digits: "halfwidth",
  alphabets: "halfwidth",
  katakana: "preserve",
  kanaScript: "preserve",
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

Type: `"preserve" | "halfwidth"`  
Default: `"halfwidth"`

`"halfwidth"` は全角スペースを半角スペースにします。`"preserve"` を選んでも、`trim` が有効なら前後の全角スペースは取り除かれます。

```ts
normalizeJaInput("山田　太郎")
// => "山田 太郎"
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
```

電話番号やメールアドレスの妥当性は、変換後にフォーム側で確認してください。

---

## Live Demo

- Demo → `https://fusaihanabi.github.io/normalize-ja-input`
- npm → `https://www.npmjs.com/package/normalize-ja-input`
- GitHub → `https://github.com/fusaihanabi/normalize-ja-input`
- Official → `https://dl.fusai-hanabi.com`

デモを更新するときは `npm run build` で `dist/` と `docs/index.js` を生成し、GitHub Pages 用の `docs/index.js` をソースの変更と一緒にコミットします。

公開前の確認には `npm run test:package` を使います。ビルド後に `npm pack` のアーカイブを一時ディレクトリへインストールし、公開 API の読み込みと型解決を確認します。`npm publish` の公開前処理でも、この確認と単体テストが実行されます。

`npm publish --dry-run --offline` も別途実行し、公開前処理がドライランでも配布テストを完了できることを確認します。

---

## What this library does not do

This library intentionally does not validate Japanese phone numbers, postal codes, addresses, or names.

It only normalizes common input variations before validation or storage.

## License

MIT
