import { CryptoError, type Encoding } from "@/features/aes-gcm/types"

const base64Alphabet =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

export function encode(encoding: Encoding, bytes: Uint8Array): string {
  if (encoding === "Hex") return encodeHex(bytes)
  const base64 = encodeBase64(bytes)
  if (encoding === "Base64") return base64
  return base64.replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "")
}

export function decode(encoding: Encoding, value: string): Uint8Array {
  const compact = value.replace(/\s+/gu, "")
  if (encoding === "Hex") return decodeHex(compact)
  if (encoding === "Base64URL" && /[+/]/u.test(compact)) {
    throw new CryptoError("invalid-encoding")
  }
  if (encoding === "Base64" && /[-_]/u.test(compact)) {
    throw new CryptoError("invalid-encoding")
  }
  const normalized =
    encoding === "Base64URL"
      ? toPaddedBase64(compact.replaceAll("-", "+").replaceAll("_", "/"))
      : compact
  return decodeBase64(normalized)
}

function encodeHex(bytes: Uint8Array): string {
  const parts: string[] = []
  for (const byte of bytes) parts.push(byte.toString(16).padStart(2, "0"))
  return parts.join("")
}

function decodeHex(value: string): Uint8Array {
  if (value.length % 2 !== 0 || /[^0-9a-f]/iu.test(value)) {
    throw new CryptoError("invalid-encoding")
  }
  const bytes = new Uint8Array(value.length / 2)
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16)
  }
  return bytes
}

function encodeBase64(bytes: Uint8Array): string {
  let result = ""
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index]
    const hasSecond = index + 1 < bytes.length
    const hasThird = index + 2 < bytes.length
    const second = hasSecond ? bytes[index + 1] : 0
    const third = hasThird ? bytes[index + 2] : 0
    const triple = (first << 16) | (second << 8) | third
    result += base64Alphabet[(triple >> 18) & 63]
    result += base64Alphabet[(triple >> 12) & 63]
    result += hasSecond ? base64Alphabet[(triple >> 6) & 63] : "="
    result += hasThird ? base64Alphabet[triple & 63] : "="
  }
  return result
}

function toPaddedBase64(value: string): string {
  if (value.includes("=")) return value
  return value + "=".repeat((4 - (value.length % 4)) % 4)
}

function decodeBase64(value: string): Uint8Array {
  if (value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/u.test(value)) {
    throw new CryptoError("invalid-encoding")
  }
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0
  const body = value.slice(0, value.length - padding)
  if (body.includes("=")) throw new CryptoError("invalid-encoding")

  const output = new Uint8Array((body.length * 3) / 4)
  let written = 0
  for (let index = 0; index < body.length; index += 4) {
    const chunk = body.slice(index, index + 4)
    const values = [0, 0, 0, 0]
    for (let offset = 0; offset < chunk.length; offset += 1) {
      const code = base64Alphabet.indexOf(chunk[offset])
      if (code < 0) throw new CryptoError("invalid-encoding")
      values[offset] = code
    }
    output[written] = (values[0] << 2) | (values[1] >> 4)
    written += 1
    if (chunk.length > 2) {
      output[written] = ((values[1] & 15) << 4) | (values[2] >> 2)
      written += 1
    }
    if (chunk.length > 3) {
      output[written] = ((values[2] & 3) << 6) | values[3]
      written += 1
    }
  }
  return output
}
