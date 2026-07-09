import * as Dialog from '@radix-ui/react-dialog'
import { ReactNode } from 'react'

type UiDialogProps = {
  open: boolean
  onClose: () => void
  children: ReactNode
}

export function UiDialog({ open, onClose, children }: UiDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="radix-dialog-overlay" />
        <Dialog.Content className="radix-dialog-content">{children}</Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
