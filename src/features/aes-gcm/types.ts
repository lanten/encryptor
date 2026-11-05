export const encodings = ["Hex", "Base64", "Base64URL"] as const

export type Encoding = (typeof encodings)[number]

export function isEncoding(value: string): value is Encoding {
  return encodings.some((encoding) => encoding === value)
}

export type CryptoErrorCode =
  | "empty-plaintext"
  | "empty-password"
  | "empty-iv"
  | "empty-salt"
  | "empty-ciphertext"
  | "invalid-encoding"
  | "invalid-iv"
  | "invalid-salt"
  | "invalid-ciphertext"
  | "iv-length"
  | "salt-length"
  | "ciphertext-length"
  | "encrypt-failed"
  | "decrypt-failed"

export class CryptoError extends Error {
  readonly code: CryptoErrorCode

  constructor(code: CryptoErrorCode) {
    super(code)
    this.name = "CryptoError"
    this.code = code
  }
}

export type AesEncryptResult = {
  ciphertext: Uint8Array
  iv: Uint8Array
  salt: Uint8Array
  additionalData?: string
}
