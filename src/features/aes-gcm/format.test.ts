import { describe, expect, it } from "vitest"
import { formatEncryptResult } from "@/features/aes-gcm/format"

const base = {
  ciphertext: "abc",
  iv: "iv",
  salt: "salt",
  tagLength: 128,
  encoding: "Hex",
} as const

describe("formatEncryptResult", () => {
  it("按固定顺序输出全部字段", () => {
    const text = formatEncryptResult({ ...base, additionalData: "note" })
    const lines = text.split("\n")
    expect(lines).toEqual([
      "- 密文: abc",
      "- iv: iv",
      "- salt: salt",
      "- tagLength: 128",
      "- additionalData: note",
      "- 编码: Hex",
    ])
  })

  it("附加数据为空时不输出该行", () => {
    const text = formatEncryptResult(base)
    expect(text).not.toContain("additionalData")
    expect(text).toContain("- 编码: Hex")
  })
})