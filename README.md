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

Type: `boolean`  
Default: `true`

連続する半角スペース、タブ、改行を1つの半角スペースにします。

```ts
normalizeJaInput("山田   太郎")
// => "山田 太郎"
```

### `spaces`

Type: `"preserve" | "halfwidth"`  
Default: `"halfwidth"`

全角スペースを半角スペースにします。

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

Type: `"preserve" | "ascii"`  
Default: `"ascii"`

日本語入力で混ざりがちなハイフン類を ASCII の `-` に統一します。

```ts
normalizeJaInput("090ー1234−5678")
// => "090-1234-5678"
```

---

## Live Demo

- Demo → `https://normalize-ja-input.github.io`
- npm → `https://www.npmjs.com/package/normalize-ja-input`
- GitHub → `https://github.com/fusaihanabi/normalize-ja-input`
- Official → `https://dl.fusai-hanabi.com`

---

## What this library does not do

This library intentionally does not validate Japanese phone numbers, postal codes, addresses, or names.

It only normalizes common input variations before validation or storage.

## License

MIT
