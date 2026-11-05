import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Encoding } from "@/features/aes-gcm/types"
import { formatEncryptResult } from "@/features/aes-gcm/format"
import { copyText } from "@/lib/clipboard"

export type EncryptView = {
  kind: "encrypt"
  ciphertext: string
  iv: string
  salt: string
  tagLength: 128
  additionalData?: string
  encoding: Encoding
}

export type DecryptView = {
  kind: "decrypt"
  plaintext: string
  encoding: Encoding
}

type ResultDialogProps = {
  result: EncryptView | DecryptView | null
  onOpenChange: (open: boolean) => void
}

export function ResultDialog({ result, onOpenChange }: ResultDialogProps) {
  return (
    <Dialog open={result !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {result?.kind === "encrypt" ? (
          <EncryptBody result={result} />
        ) : null}
        {result?.kind === "decrypt" ? (
          <DecryptBody result={result} />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function EncryptBody({ result }: { result: EncryptView }) {
  const fields = [
    ["密文", result.ciphertext],
    ["iv", result.iv],
    ["salt", result.salt],
    ["tagLength", String(result.tagLength)],
    ...(result.additionalData === undefined
      ? []
      : [["additionalData", result.additionalData]]),
    ["编码", result.encoding],
  ]

  return (
    <>
      <DialogHeader>
        <DialogTitle>加密结果</DialogTitle>
        <DialogDescription>请牢记密码，遗失不可恢复</DialogDescription>
      </DialogHeader>
      <FieldList fields={fields} />
      <CopyFooter text={formatEncryptResult(result)} label="复制" />
    </>
  )
}

function DecryptBody({ result }: { result: DecryptView }) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>解密结果</DialogTitle>
        <DialogDescription>原文已解出</DialogDescription>
      </DialogHeader>
      <FieldList
        fields={[
          ["原文", result.plaintext],
          ["编码", result.encoding],
        ]}
      />
      <CopyFooter text={result.plaintext} label="复制" />
    </>
  )
}

function FieldList({ fields }: { fields: string[][] }) {
  return (
    <dl className="grid gap-3 text-sm">
      {fields.map(([label, value]) => (
        <div key={label} className="grid gap-1">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="font-mono break-all">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function CopyFooter({ text, label }: { text: string; label: string }) {
  function handleCopy() {
    void copyText(text).then(
      () => toast.success("已复制"),
      () => toast.error("复制失败"),
    )
  }

  return (
    <DialogFooter>
      <Button type="button" onClick={handleCopy}>
        {label}
      </Button>
    </DialogFooter>
  )
}
