import { useState } from 'react'
import { CheckIcon, CopyIcon } from '@quick-ui/icons'

const COPIED_MS = 1500

/** Copies `text` and says so for a moment. */
export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setFailed(false)
      setCopied(true)
      window.setTimeout(() => setCopied(false), COPIED_MS)
    } catch {
      setFailed(true)
    }
  }
  const Icon = copied ? CheckIcon : CopyIcon
  return (
    <button type="button" className="copy-button" onClick={copy} aria-label={copied ? 'Copied' : label}>
      <Icon className="size-4" />
      <span>{failed ? 'Copy failed' : copied ? 'Copied' : label}</span>
    </button>
  )
}

export function Code({ children, language = 'tsx' }: { children: string; language?: string }) {
  const text = children.trim()
  return (
    <div className="code">
      <div className="code-bar">
        <span>{language}</span>
        <CopyButton text={text} />
      </div>
      <pre>
        <code>{text}</code>
      </pre>
    </div>
  )
}
