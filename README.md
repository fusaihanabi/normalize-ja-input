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

| 入力欄 | オプション | 入力 → 出力 |
| --- | --- | --- |
| 電話番号 | `{ hyphens: "between-digits" }` | `０９０ー１２３４` → `090-1234` |
| 氏名 | `{ hyphens: "preserve" }` | `メアリー　山田` → `メアリー 山田` |
| メールアドレス・ID | `{ punctuation: "ascii", hyphens: "preserve" }` | `ａ＿１＠ｅｘａｍｐｌｅ．ｊｐ` → `a_1@example.jp` |
| 複数行の住所 | `{ collapseSpaces: "horizontal" }` | 各行のスペースやタブをまとめ、途中の改行を残す |

メールアドレスや ID の妥当性は、変換後にフォーム側で確認してください。

---

## Live Demo

- Demo → `https://fusaihanabi.github.io/normalize-ja-input`
- npm → `https://www.npmjs.com/package/normalize-ja-input`
- GitHub → `https://github.com/fusaihanabi/normalize-ja-input`
- Official → `https://dl.fusai-hanabi.com`

デモを更新するときは `npm run build` で `dist/` と `docs/index.js` を生成し、GitHub Pages 用の `docs/index.js` をソースの変更と一緒にコミットします。

---

## What this library does not do

This library intentionally does not validate Japanese phone numbers, postal codes, addresses, or names.

It only normalizes common input variations before validation or storage.

## License

MIT
