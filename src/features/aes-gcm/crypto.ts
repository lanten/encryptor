import { argon2id } from "hash-wasm"
import {
  CryptoError,
  type AesEncryptResult,
  type CryptoErrorCode,
} from "@/features/aes-gcm/types"

// 这些参数是兼容性契约，改动会使旧密文无法解密
export const aesParams = {
  parallelism: 1,
  iterations: 2,
  memorySize: 19456,
  hashLength: 32,
  tagLength: 128,
} as const

const ivLength = 12
const generatedSaltLength = 16
const minSaltLength = 8
const maxSaltLength = 64
const minCiphertextLength = 16

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

type EncryptInput = {
  plaintext: string
  password: string
  iv?: Uint8Array
  salt?: Uint8Array
  additionalData?: string
}

type DecryptInput = {
  ciphertext: Uint8Array
  password: string
  iv: Uint8Array
  salt: Uint8Array
  additionalData?: string
}

export async function encryptAesGcm(
  input: EncryptInput,
): Promise<AesEncryptResult> {
  try {
    if (input.plaintext.length === 0) throw new CryptoError("empty-plaintext")
    if (input.password.length === 0) throw new CryptoError("empty-password")

    const iv = input.iv ?? randomBytes(ivLength)
    const salt = input.salt ?? randomBytes(generatedSaltLength)
    assertIv(iv)
    assertSalt(salt)
    const extra = normalizeAdditionalData(input.additionalData)
    const key = await deriveKey(input.password, salt, ["encrypt"])
    const ciphertext = new Uint8Array(
      await crypto.subtle.encrypt(
        aesGcmParams(iv, extra),
        key,
        textEncoder.encode(input.plaintext),
      ),
    )
    return {
      ciphertext,
      iv,
      salt,
      additionalData: extra ? input.additionalData?.trim() : undefined,
    }
  } catch (error) {
    throw asFailure(error, "encrypt-failed")
  }
}

export async function decryptAesGcm(input: DecryptInput): Promise<string> {
  try {
    if (input.password.length === 0) throw new CryptoError("empty-password")
    if (input.ciphertext.length === 0) throw new CryptoError("empty-ciphertext")
    if (input.ciphertext.length < minCiphertextLength) {
      throw new CryptoError("ciphertext-length")
    }
    assertIv(input.iv)
    assertSalt(input.salt)
    const extra = normalizeAdditionalData(input.additionalData)
    const key = await deriveKey(input.password, input.salt, ["decrypt"])
    const plaintext = await crypto.subtle.decrypt(
      aesGcmParams(input.iv, extra),
      key,
      bytes(input.ciphertext),
    )
    return textDecoder.decode(plaintext)
  } catch (error) {
    throw asFailure(error, "decrypt-failed")
  }
}

function assertIv(iv: Uint8Array): void {
  if (iv.length !== ivLength) throw new CryptoError("iv-length")
}

function assertSalt(salt: Uint8Array): void {
  if (salt.length < minSaltLength || salt.length > maxSaltLength) {
    throw new CryptoError("salt-length")
  }
}

function normalizeAdditionalData(value: string | undefined): Uint8Array | undefined {
  const trimmed = value?.trim() ?? ""
  if (trimmed.length === 0) return undefined
  return textEncoder.encode(trimmed)
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytes
}

function aesGcmParams(
  iv: Uint8Array,
  additionalData: Uint8Array | undefined,
): AesGcmParams {
  return {
    name: "AES-GCM",
    iv: bytes(iv),
    tagLength: aesParams.tagLength,
    ...(additionalData ? { additionalData: bytes(additionalData) } : {}),
  }
}

function bytes(value: Uint8Array): Uint8Array<ArrayBuffer> {
  return new Uint8Array(value)
}

async function deriveKey(
  password: string,
  salt: Uint8Array,
  usages: KeyUsage[],
): Promise<CryptoKey> {
  const derived = await argon2id({
    password,
    salt,
    parallelism: aesParams.parallelism,
    iterations: aesParams.iterations,
    memorySize: aesParams.memorySize,
    hashLength: aesParams.hashLength,
    outputType: "binary",
  })
  // derived 是 hash-wasm 内部 WASM 内存的视图，不能直接清零，否则会破坏下次调用
  const keyBytes = bytes(derived)
  try {
    return await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, usages)
  } finally {
    keyBytes.fill(0)
  }
}

function asFailure(error: unknown, fallback: CryptoErrorCode): CryptoError {
  if (error instanceof CryptoError) return error
  const wrapped = new CryptoError(fallback)
  if (error instanceof Error) wrapped.cause = error
  return wrapped
}
