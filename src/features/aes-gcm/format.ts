import type { Encoding } from "@/features/aes-gcm/types"

export type EncryptCopy = {
  ciphertext: string
  iv: string
  salt: string
  tagLength: number
  additionalData?: string
  encoding: Encoding
}

export function formatEncryptResult(result: EncryptCopy): string {
  const lines = [
    `- 密文: ${result.ciphertext}`,
    `- iv: ${result.iv}`,
    `- salt: ${result.salt}`,
    `- tagLength: ${result.tagLength}`,
  ]
  if (result.additionalData !== undefined) {
    lines.push(`- additionalData: ${result.additionalData}`)
  }
  lines.push(`- 编码: ${result.encoding}`)
  return lines.join("\n")
}
