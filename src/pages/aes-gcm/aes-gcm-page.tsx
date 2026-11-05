import { useRef, useState, type ReactNode } from "react"
import { Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { decode, encode } from "@/features/aes-gcm/codec"
import { decryptAesGcm, encryptAesGcm } from "@/features/aes-gcm/crypto"
import {
  ResultDialog,
  type DecryptView,
  type EncryptView,
} from "@/features/aes-gcm/result-dialog"
import {
  CryptoError,
  encodings,
  isEncoding,
  type CryptoErrorCode,
  type Encoding,
} from "@/features/aes-gcm/types"

const messages: Record<CryptoErrorCode, string> = {
  "empty-plaintext": "请填写明文",
  "empty-password": "请填写密码",
  "empty-iv": "请填写 IV",
  "empty-salt": "请填写盐",
  "empty-ciphertext": "请填写密文",
  "invalid-encoding": "编码无效",
  "invalid-iv": "IV 编码无效",
  "invalid-salt": "盐编码无效",
  "invalid-ciphertext": "密文编码无效",
  "iv-length": "IV 必须是 12 字节",
  "salt-length": "盐长度必须在 8 到 64 字节之间",
  "ciphertext-length": "密文长度不足",
  "encrypt-failed": "加密失败",
  "decrypt-failed": "解密失败，请检查密码、IV、盐、附加数据、编码或密文",
}

export function AesGcmPage() {
  const [plaintext, setPlaintext] = useState("")
  const [password, setPassword] = useState("")
  const [iv, setIv] = useState("")
  const [salt, setSalt] = useState("")
  const [additionalData, setAdditionalData] = useState("")
  const [encoding, setEncoding] = useState<Encoding>("Hex")
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState<"idle" | "deriving">("idle")
  const [result, setResult] = useState<EncryptView | DecryptView | null>(null)
  const busy = useRef(false)

  async function run(
    fallback: CryptoErrorCode,
    task: () => Promise<void>,
  ): Promise<void> {
    if (busy.current) return
    busy.current = true
    setStatus("deriving")
    setResult(null)
    await afterPaint()
    try {
      await task()
    } catch (caught) {
      toast.error(messageFrom(caught, fallback))
    } finally {
      busy.current = false
      setStatus("idle")
    }
  }

  function encrypt() {
    void run("encrypt-failed", async () => {
      if (plaintext.length === 0) throw new CryptoError("empty-plaintext")
      if (password.length === 0) throw new CryptoError("empty-password")
      const encrypted = await encryptAesGcm({
        plaintext,
        password,
        iv: readOptional(encoding, iv, "invalid-iv"),
        salt: readOptional(encoding, salt, "invalid-salt"),
        additionalData,
      })
      const ivText = encode(encoding, encrypted.iv)
      const saltText = encode(encoding, encrypted.salt)
      setIv(ivText)
      setSalt(saltText)
      setResult({
        kind: "encrypt",
        ciphertext: encode(encoding, encrypted.ciphertext),
        iv: ivText,
        salt: saltText,
        tagLength: 128,
        additionalData: encrypted.additionalData,
        encoding,
      })
    })
  }

  function decrypt() {
    void run("decrypt-failed", async () => {
      if (plaintext.length === 0) throw new CryptoError("empty-ciphertext")
      if (password.length === 0) throw new CryptoError("empty-password")
      const ivText = iv.replace(/\s+/gu, "")
      const saltText = salt.replace(/\s+/gu, "")
      const ciphertextText = plaintext.replace(/\s+/gu, "")
      if (ivText.length === 0) throw new CryptoError("empty-iv")
      if (saltText.length === 0) throw new CryptoError("empty-salt")
      if (ciphertextText.length === 0) throw new CryptoError("empty-ciphertext")
      const decoded = await decryptAesGcm({
        ciphertext: readEncoded(encoding, ciphertextText, "invalid-ciphertext"),
        password,
        iv: readEncoded(encoding, ivText, "invalid-iv"),
        salt: readEncoded(encoding, saltText, "invalid-salt"),
        additionalData,
      })
      setResult({
        kind: "decrypt",
        plaintext: decoded,
        encoding,
      })
    })
  }

  const deriving = status === "deriving"

  return (
    <>
      <Card className="mx-auto w-full max-w-160">
        <CardHeader>
          <CardTitle>AES-256-GCM</CardTitle>
          <CardDescription>
            加密时填写原文。解密时把密文填在第一个输入框。
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field label="明文 / 密文" htmlFor="plaintext">
            <Textarea
              id="plaintext"
              value={plaintext}
              onChange={(event) => setPlaintext(event.target.value)}
              spellCheck={false}
              className="min-h-28 font-mono"
            />
          </Field>
          <Field label="密码" htmlFor="password">
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => setPassword(event.target.value)}
                className="pr-9"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "隐藏密码" : "显示密码"}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </Field>
          <Field label="IV" htmlFor="iv" hint="留空则在加密时生成 12 字节">
            <Input
              id="iv"
              value={iv}
              spellCheck={false}
              onChange={(event) => setIv(event.target.value)}
              className="font-mono"
            />
          </Field>
          <Field label="盐" htmlFor="salt" hint="留空则在加密时生成 16 字节">
            <Input
              id="salt"
              value={salt}
              spellCheck={false}
              onChange={(event) => setSalt(event.target.value)}
              className="font-mono"
            />
          </Field>
          <Field label="附加数据" htmlFor="additional-data">
            <Input
              id="additional-data"
              value={additionalData}
              spellCheck={false}
              onChange={(event) => setAdditionalData(event.target.value)}
            />
          </Field>
          <Field
            label="编码"
            htmlFor="encoding"
            hint="只作用于密文、IV、盐"
          >
            <Select
              value={encoding}
              onValueChange={(value) => {
                if (isEncoding(value)) setEncoding(value)
              }}
            >
              <SelectTrigger id="encoding" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {encodings.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="flex gap-2 pt-2">
            <Button type="button" disabled={deriving} onClick={encrypt}>
              加密
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={deriving}
              onClick={decrypt}
            >
              解密
            </Button>
          </div>
          {deriving ? (
            <p className="text-sm text-muted-foreground">正在派生密钥…</p>
          ) : null}
        </CardContent>
      </Card>
      <ResultDialog
        result={result}
        onOpenChange={(open) => {
          if (!open) setResult(null)
        }}
      />
    </>
  )
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

function readOptional(
  encoding: Encoding,
  value: string,
  invalid: CryptoErrorCode,
): Uint8Array | undefined {
  if (value.replace(/\s+/gu, "").length === 0) return undefined
  return readEncoded(encoding, value, invalid)
}

function readEncoded(
  encoding: Encoding,
  value: string,
  invalid: CryptoErrorCode,
): Uint8Array {
  try {
    return decode(encoding, value)
  } catch (error) {
    if (error instanceof CryptoError && error.code === "invalid-encoding") {
      throw new CryptoError(invalid)
    }
    throw error
  }
}

function messageFrom(error: unknown, fallback: CryptoErrorCode): string {
  if (error instanceof CryptoError) return messages[error.code]
  return messages[fallback]
}

function afterPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      setTimeout(resolve, 0)
    })
  })
}
