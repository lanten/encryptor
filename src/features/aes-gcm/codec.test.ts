import { describe, expect, it } from "vitest"
import { decode, encode } from "@/features/aes-gcm/codec"
import { CryptoError } from "@/features/aes-gcm/types"

const sample = new Uint8Array([251, 255, 191])

describe("Hex", () => {
  it("以小写无分隔符写出", () => {
    expect(encode("Hex", sample)).toBe("fbffbf")
  })

  it("读入忽略大小写并去空白", () => {
    expect(decode("Hex", "FB FF BF")).toEqual(sample)
  })

  it("拒绝奇数长度", () => {
    expect(() => decode("Hex", "fbf")).toThrow(CryptoError)
  })

  it("拒绝非法字符", () => {
    expect(() => decode("Hex", "zz")).toThrow(CryptoError)
  })
})

describe("Base64", () => {
  it("往返一致", () => {
    const text = encode("Base64", sample)
    expect(text).toContain("+")
    expect(text).toContain("/")
    expect(decode("Base64", text)).toEqual(sample)
  })

  it("拒绝 Base64URL 字符", () => {
    expect(() => decode("Base64", "-_")).toThrow(CryptoError)
  })

  it("拒绝非法填充", () => {
    expect(() => decode("Base64", "YQ===")).toThrow(CryptoError)
    expect(() => decode("Base64", "YQ=A")).toThrow(CryptoError)
  })
})

describe("Base64URL", () => {
  it("往返一致且不带填充", () => {
    const text = encode("Base64URL", sample)
    expect(text).not.toContain("=")
    expect(decode("Base64URL", text)).toEqual(sample)
  })

  it("拒绝标准 Base64 字符", () => {
    expect(() => decode("Base64URL", encode("Base64", sample))).toThrow(
      CryptoError,
    )
  })

  it("接受带填充的输入", () => {
    expect(decode("Base64URL", "-w==")).toEqual(new Uint8Array([251]))
  })
})

describe("空白处理", () => {
  it("解析时去掉所有空白", () => {
    expect(decode("Hex", "fb ff\nbf")).toEqual(sample)
  })
})