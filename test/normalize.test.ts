import { describe, expect, it } from "vitest"
import { normalizeJaInput } from "../src/index"

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
