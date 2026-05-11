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

  it("can disable trim", () => {
    expect(normalizeJaInput(" 山田 ", { trim: false })).toBe(" 山田 ")
  })

  it("can disable space collapsing", () => {
    expect(normalizeJaInput("山田   太郎", { collapseSpaces: false })).toBe(
      "山田   太郎",
    )
  })
})
