import type { ReactNode } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  wide = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  wide?: boolean
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="dialog-overlay" />
        <DialogPrimitive.Content className={`dialog-content ${wide ? 'dialog-wide' : ''}`}>
          <DialogPrimitive.Title className="dialog-title">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description
            className={description ? 'muted dialog-description' : 'sr-only'}
          >
            {description || title}
          </DialogPrimitive.Description>
          {children}
          <DialogPrimitive.Close
            className="button button-ghost button-icon dialog-close"
            aria-label="Close dialog"
          >
            <X size={20} />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
