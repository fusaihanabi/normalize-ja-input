import { describe, expect, it } from "vitest"
import { jaInputPresets, normalizeJaInput } from "../src/index"

describe("normalizeJaInput", () => {
  it("trims and normalizes full-width spaces", () => {
    expect(normalizeJaInput("　山田　太郎　")).toBe("山田 太郎")
  })

  it("collapses consecutive whitespace", () => {
    expect(normalizeJaInput("山田   \t\n  太郎")).toBe("山田 太郎")
  })

  it("converts full-width digits to half-width digits", () => {
    expect(normalizeJaInput("１２３４５６７８９０")).toBe("1234567890")
  })

  it("converts full-width alphabets to half-width alphabets", () => {
    expect(normalizeJaInput("ＡＢＣｘｙｚ")).toBe("ABCxyz")
  })

  it("normalizes common hyphen-like characters", () => {
    expect(normalizeJaInput("090ー1234−5678")).toBe("090-1234-5678")
    expect(normalizeJaInput("A－B―C‐D‑E‒F–G—H﹣IｰJ")).toBe("A-B-C-D-E-F-G-H-I-J")
  })

  it("normalizes common Japanese form input", () => {
    expect(normalizeJaInput("　ＴＥＬ：０９０ー１２３４ー５６７８　")).toBe(
      "TEL：090-1234-5678",
    )
  })

  it("can preserve spaces", () => {
    expect(normalizeJaInput("　山田　太郎　", { spaces: "preserve" })).toBe(
      "山田　太郎",
    )
  })

  it("preserves no-break spaces in the existing space modes", () => {
    const input = "山田\u3000\u00a0\u202f太郎"
    expect(normalizeJaInput(input)).toBe("山田 \u00a0\u202f太郎")
    expect(normalizeJaInput(input, { spaces: "halfwidth" })).toBe("山田 \u00a0\u202f太郎")
    expect(normalizeJaInput(input, { spaces: "preserve" })).toBe(input)
  })

  it("converts only the supported spaces before optional collapsing", () => {
    const input = "山田\u3000\u00a0\u202f太郎\u2007様"
    expect(normalizeJaInput(input, { spaces: "ascii" })).toBe("山田 太郎\u2007様")
    expect(normalizeJaInput(input, { spaces: "ascii", collapseSpaces: false })).toBe(
      "山田   太郎\u2007様",
    )
  })

  it("trims after the space conversion unless disabled", () => {
    const input = "\u00a0山田\u202f太郎\u3000"
    expect(normalizeJaInput(input, { spaces: "ascii" })).toBe("山田 太郎")
    expect(normalizeJaInput(input, { spaces: "ascii", trim: false })).toBe(" 山田 太郎 ")
    expect(normalizeJaInput(input, { spaces: "preserve" })).toBe("山田\u202f太郎")
  })

  it("can preserve digits", () => {
    expect(normalizeJaInput("１２３", { digits: "preserve" })).toBe("１２３")
  })

  it("can preserve alphabets", () => {
    expect(normalizeJaInput("ＡＢＣ", { alphabets: "preserve" })).toBe("ＡＢＣ")
  })

  it("can preserve hyphens", () => {
    expect(normalizeJaInput("090ー1234", { hyphens: "preserve" })).toBe(
      "090ー1234",
    )
  })

  it("can normalize hyphen variants only between digits", () => {
    const options = { hyphens: "between-digits" } as const
    expect(normalizeJaInput("コーヒー", options)).toBe("コーヒー")
    expect(normalizeJaInput("０９０ー１２３４−５６７８", options)).toBe("090-1234-5678")
    expect(normalizeJaInput("コーヒー ０９０ー１２３４", options)).toBe("コーヒー 090-1234")
    expect(normalizeJaInput("ーA－1ー Bー1 1ーA 1ーー2 1ー", options)).toBe(
      "ーA－1ー Bー1 1ーA 1ーー2 1ー",
    )
    expect(normalizeJaInput("０ー9−２ｰ３", { ...options, digits: "preserve" })).toBe("０-9-２-３")
  })

  it("can disable trim", () => {
    expect(normalizeJaInput(" 山田 ", { trim: false })).toBe(" 山田 ")
  })

  it("preserves punctuation by default or when explicitly requested", () => {
    expect(normalizeJaInput("＠．＿＋")).toBe("＠．＿＋")
    expect(normalizeJaInput("＠．＿＋", { punctuation: "preserve" })).toBe("＠．＿＋")
  })

  it("converts only the supported punctuation when requested", () => {
    const options = { punctuation: "ascii" } as const
    expect(normalizeJaInput("＠．＿＋：／。", options)).toBe("@._+：／。")
    expect(normalizeJaInput("　ｔｅｓｔ＋１＠ｅｘａｍｐｌｅ．ｊｐ　", options)).toBe(
      "test+1@example.jp",
    )
  })

  it("normalizes punctuation independently of hyphens", () => {
    expect(normalizeJaInput("Ａ＿Ｂ－１", { punctuation: "ascii", hyphens: "preserve" })).toBe(
      "A_B－1",
    )
    expect(normalizeJaInput("０９０ー１２３４＠コーヒー", {
      punctuation: "ascii",
      hyphens: "between-digits",
    })).toBe("090-1234@コーヒー")
  })

  it("preserves half-width katakana by default or when explicitly requested", () => {
    expect(normalizeJaInput("ﾔﾏﾀﾞ")).toBe("ﾔﾏﾀﾞ")
    expect(normalizeJaInput("ｽｰﾊﾟｰ", { katakana: "preserve" })).toBe("ｽ-ﾊﾟ-")
    expect(normalizeJaInput("ｽｰﾊﾟｰ", { katakana: "preserve", hyphens: "preserve" })).toBe(
      "ｽｰﾊﾟｰ",
    )
  })

  it("converts half-width katakana and composes valid voicing marks", () => {
    const options = { katakana: "fullwidth" } as const
    expect(normalizeJaInput("ﾔﾏﾀﾞ ﾊﾟﾝ ｶﾀカナ ｳﾞ", options)).toBe("ヤマダ パン カタカナ ヴ")
    expect(normalizeJaInput("｢ｶﾅ･ﾊﾟﾝ｡｣､", options)).toBe("｢カナ･パン｡｣､")
  })

  it("preserves standalone or uncombinable half-width voicing marks", () => {
    const options = { katakana: "fullwidth" } as const
    expect(normalizeJaInput("ﾞﾟ ｱﾞ ｶﾟ カﾞ ﾊﾟﾞ", options)).toBe("ﾞﾟ アﾞ カﾟ カﾞ パﾞ")
  })

  it("applies each hyphen policy after converting half-width katakana", () => {
    const options = { katakana: "fullwidth" } as const
    const input = "ｽｰﾊﾟｰ ０９０ｰ１２３４"
    expect(normalizeJaInput(input, options)).toBe("ス-パ- 090-1234")
    expect(normalizeJaInput(input, { ...options, hyphens: "preserve" })).toBe(
      "スーパー 090ー1234",
    )
    expect(normalizeJaInput(input, { ...options, hyphens: "between-digits" })).toBe(
      "スーパー 090-1234",
    )
  })

  it("preserves the kana script by default and when explicitly requested", () => {
    const input = "やまだ　タロウ　ﾊﾅｺ"
    const expected = "やまだ タロウ ﾊﾅｺ"
    expect(normalizeJaInput(input)).toBe(expected)
    expect(normalizeJaInput(input, { kanaScript: "preserve" })).toBe(expected)
    expect(normalizeJaInput(input, jaInputPresets.furigana)).toBe("やまだ タロウ ハナコ")
  })

  it("converts hiragana and katakana with matching characters in both directions", () => {
    const hiragana = "ぁゖ がっこう ぱん ゔ ゝゞ"
    const katakana = "ァヶ ガッコウ パン ヴ ヽヾ"
    expect(normalizeJaInput(hiragana, { kanaScript: "katakana" })).toBe(katakana)
    expect(normalizeJaInput(katakana, { kanaScript: "hiragana" })).toBe(hiragana)
  })

  it("preserves unmatched characters and converts only the base of decomposed kana", () => {
    const unchanged = "ヷヸヹヺ ゟヿ 漢字・ ﾊﾟ"
    expect(normalizeJaInput(`カ\u3099ハ\u309a ${unchanged}`, { kanaScript: "hiragana" })).toBe(
      `か\u3099は\u309a ${unchanged}`,
    )
    expect(normalizeJaInput(`か\u3099は\u309a ${unchanged}`, { kanaScript: "katakana" })).toBe(
      `カ\u3099ハ\u309a ${unchanged}`,
    )
  })

  it("applies kana script conversion after width conversion and before hyphen handling", () => {
    expect(normalizeJaInput("やまだ　ﾀﾛｳ", {
      ...jaInputPresets.furigana,
      kanaScript: "katakana",
    })).toBe("ヤマダ タロウ")

    const input = "ｽｰﾊﾟｰ ０９０ｰ１２３４"
    const options = { katakana: "fullwidth", kanaScript: "hiragana" } as const
    expect(normalizeJaInput(input, options)).toBe("す-ぱ- 090-1234")
    expect(normalizeJaInput(input, { ...options, hyphens: "preserve" })).toBe("すーぱー 090ー1234")
    expect(normalizeJaInput(input, { ...options, hyphens: "between-digits" })).toBe(
      "すーぱー 090-1234",
    )
  })

  it("preserves combining kana marks by default and when explicitly requested", () => {
    const input = "か\u3099く"
    expect(normalizeJaInput(input)).toBe(input)
    expect(normalizeJaInput(input, { kanaMarks: "preserve" })).toBe(input)
    expect(normalizeJaInput(input, jaInputPresets.furigana)).toBe(input)
  })

  it("composes matching voiced and semi-voiced kana", () => {
    expect(normalizeJaInput("か\u3099く ハ\u309aン ゝ\u3099 ヽ\u3099", {
      kanaMarks: "compose",
    })).toBe("がく パン ゞ ヾ")
    expect(normalizeJaInput("ハ\u3099\u309a", { kanaMarks: "compose" })).toBe("バ\u309a")
  })

  it("preserves marks without a matching kana pair and leaves unrelated characters alone", () => {
    const input = "\u3099\u309a あ\u3099 カ\u309a か゛は゜ ﾊﾟ ｶ\u3099 e\u0301"
    expect(normalizeJaInput(input, { kanaMarks: "compose" })).toBe(input)
  })

  it("composes combining marks after optional half-width conversion", () => {
    expect(normalizeJaInput("ﾊ\u309aﾝ ﾀﾞ ﾎﾟ", {
      ...jaInputPresets.furigana,
      kanaMarks: "compose",
    })).toBe("パン ダ ポ")
  })

  it("composes before script conversion so equivalent representations stay equal", () => {
    const options = { kanaMarks: "compose", kanaScript: "katakana" } as const
    expect(normalizeJaInput("が か\u3099", options)).toBe("ガ ガ")
    expect(normalizeJaInput("ヷ ワ\u3099 パ ハ\u309a", {
      kanaMarks: "compose",
      kanaScript: "hiragana",
    })).toBe("ヷ ヷ ぱ ぱ")
  })

  it("composes newly matching pairs after script conversion and stays stable on repeat", () => {
    const options = {
      ...jaInputPresets.furigana,
      kanaMarks: "compose",
      kanaScript: "katakana",
    } as const
    const normalized = normalizeJaInput("わ\u3099 ｽｰﾊ\u309aｰ あ\u3099", options)
    expect(normalized).toBe("ヷ スーパー ア\u3099")
    expect(normalizeJaInput(normalized, options)).toBe(normalized)
  })

  it("can disable space collapsing", () => {
    expect(normalizeJaInput("山田   太郎", { collapseSpaces: false })).toBe(
      "山田   太郎",
    )
  })

  it("can collapse horizontal whitespace while preserving line breaks", () => {
    expect(normalizeJaInput("\n山田　 \t太郎\r\n東京都  港区\n", {
      collapseSpaces: "horizontal",
      trim: false,
    })).toBe("\n山田 太郎\r\n東京都 港区\n")
    expect(normalizeJaInput("\n山田\n太郎\n", { collapseSpaces: "horizontal" })).toBe("山田\n太郎")
    expect(normalizeJaInput("山田\n太郎")).toBe("山田 太郎")
  })
})

describe("jaInputPresets", () => {
  it("normalizes phone separators between digits and preserves other long marks", () => {
    expect(normalizeJaInput("コーヒー ０９０ー１２３４−５６７８", jaInputPresets.phone)).toBe(
      "コーヒー 090-1234-5678",
    )
  })

  it("normalizes furigana and keeps the long vowel marks", () => {
    expect(normalizeJaInput("ｽｰﾊﾟｰ　ﾔﾏﾀﾞ", jaInputPresets.furigana)).toBe("スーパー ヤマダ")
  })

  it("normalizes email punctuation and preserves interior whitespace and hyphens", () => {
    expect(normalizeJaInput("　ｔｅｓｔ＋１＠ｅｘａｍｐｌｅ．ｊｐ　", jaInputPresets.email)).toBe(
      "test+1@example.jp",
    )
    expect(normalizeJaInput("　Ａ－Ｂ　 \n＠ｅｘａｍｐｌｅ．ｊｐ　", jaInputPresets.email)).toBe(
      "A－B　 \n@example.jp",
    )
    expect(normalizeJaInput("\u202fＡ\u00a0\u202fＢ＠ｅｘａｍｐｌｅ．ｊｐ\u00a0", jaInputPresets.email)).toBe(
      "A\u00a0\u202fB@example.jp",
    )
  })

  it("normalizes multiline addresses and supports overriding individual options", () => {
    const input = "\n東京都　　港区\nメゾン青山　１０１\n"
    expect(normalizeJaInput(input, jaInputPresets.multilineAddress)).toBe(
      "東京都 港区\nメゾン青山 101",
    )
    expect(normalizeJaInput(input, { ...jaInputPresets.multilineAddress, trim: false })).toBe(
      "\n東京都 港区\nメゾン青山 101\n",
    )
    expect(normalizeJaInput(input)).toBe("東京都 港区 メゾン青山 101")
  })

  it("can normalize pasted spaces without folding address line breaks", () => {
    const input = "東京都\u00a0港区\r\n芝公園\u202f\u3000１丁目"
    expect(normalizeJaInput(input, {
      ...jaInputPresets.multilineAddress,
      spaces: "ascii",
    })).toBe("東京都 港区\r\n芝公園 1丁目")
  })

  it("freezes the preset registry and every option object", () => {
    expect(Object.isFrozen(jaInputPresets)).toBe(true)
    for (const options of Object.values(jaInputPresets)) {
      expect(Object.isFrozen(options)).toBe(true)
    }
  })
})
