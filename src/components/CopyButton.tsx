import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from './ui/button'
import { copyFormatted } from '../lib/transfer'
import type { Formatted } from '../lib/citations'
import { useApp } from '../app/AppProvider'
export function CopyButton({
  value,
  label = 'Copy citation',
  disabled = false,
}: {
  value: Formatted
  label?: string
  disabled?: boolean
}) {
  const [copied, setCopied] = useState(false)
  const { notify } = useApp()
  return (
    <Button
      variant="outline"
      disabled={disabled || !value.text}
      onClick={async () => {
        try {
          const mode = await copyFormatted(value)
          setCopied(true)
          notify(
            mode === 'rich'
              ? 'Copied, with formatting. Ready for your document.'
              : 'Copied as plain text. Your browser could not preserve italics.',
          )
          setTimeout(() => setCopied(false), 2200)
        } catch (error) {
          notify(
            error instanceof Error
              ? error.message
              : 'Copy failed. Select the text and copy manually.',
            'error',
          )
        }
      }}
    >
      {copied ? <Check size={17} className="copy-check" /> : <Copy size={17} />}
      {copied ? 'Copied!' : label}
    </Button>
  )
}
