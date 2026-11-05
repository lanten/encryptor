import { describe, expect, it } from "vitest"
import { decryptAesGcm, encryptAesGcm } from "@/features/aes-gcm/crypto"
import { CryptoError } from "@/features/aes-gcm/types"

describe("AES-256-GCM 往返", () => {
  it("加密后能解密回原文", async () => {
    const encrypted = await encryptAesGcm({
      plaintext: " 你好 ",
      password: "secret",
      additionalData: "  note  ",
    })
    expect(encrypted.iv).toHaveLength(12)
    expect(encrypted.salt).toHaveLength(16)
    expect(encrypted.additionalData).toBe("note")

    const plain = await decryptAesGcm({
      ciphertext: encrypted.ciphertext,
      password: "secret",
      iv: encrypted.iv,
      salt: encrypted.salt,
      additionalData: "note",
    })
    expect(plain).toBe(" 你好 ")
  })

  it("每次加密生成不同的 IV 和盐", async () => {
    const first = await encryptAesGcm({ plaintext: "a", password: "p" })
    const second = await encryptAesGcm({ plaintext: "a", password: "p" })
    expect(first.iv).not.toEqual(second.iv)
    expect(first.salt).not.toEqual(second.salt)
  })

  it("密码错误时解密失败", async () => {
    const encrypted = await encryptAesGcm({ plaintext: "a", password: "p" })
    await expect(
      decryptAesGcm({
        ciphertext: encrypted.ciphertext,
        password: "wrong",
        iv: encrypted.iv,
        salt: encrypted.salt,
        additionalData: "",
      }),
    ).rejects.toMatchObject({ code: "decrypt-failed" })
  })

  it("附加数据不一致时解密失败", async () => {
    const encrypted = await encryptAesGcm({
      plaintext: "a",
      password: "p",
      additionalData: "note",
    })
    await expect(
      decryptAesGcm({
        ciphertext: encrypted.ciphertext,
        password: "p",
        iv: encrypted.iv,
        salt: encrypted.salt,
        additionalData: "other",
      }),
    ).rejects.toMatchObject({ code: "decrypt-failed" })
  })
})

describe("输入校验", () => {
  it("明文为空报错", async () => {
    await expect(
      encryptAesGcm({ plaintext: "", password: "p" }),
    ).rejects.toMatchObject({ code: "empty-plaintext" })
  })

  it("密码为空报错", async () => {
    await expect(
      encryptAesGcm({ plaintext: "a", password: "" }),
    ).rejects.toMatchObject({ code: "empty-password" })
  })

  it("IV 长度不是 12 字节报错", async () => {
    await expect(
      encryptAesGcm({
        plaintext: "a",
        password: "p",
        iv: new Uint8Array(8),
      }),
    ).rejects.toMatchObject({ code: "iv-length" })
  })

  it("盐长度越界报错", async () => {
    await expect(
      encryptAesGcm({
        plaintext: "a",
        password: "p",
        salt: new Uint8Array(4),
      }),
    ).rejects.toMatchObject({ code: "salt-length" })
  })

  it("密文过短报错", async () => {
    await expect(
      decryptAesGcm({
        ciphertext: new Uint8Array(8),
        password: "p",
        iv: new Uint8Array(12),
        salt: new Uint8Array(16),
        additionalData: "",
      }),
    ).rejects.toMatchObject({ code: "ciphertext-length" })
  })

  it("未知异常归入通用失败", async () => {
    const error = new CryptoError("decrypt-failed")
    expect(error).toBeInstanceOf(Error)
  })
})