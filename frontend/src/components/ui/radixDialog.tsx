import { ReactNode, useEffect, useState } from 'react'

type UiDialogProps = {
  open: boolean
  onClose: () => void
  children: ReactNode
}

type DialogExports = {
  Root: any
  Portal: any
  Overlay: any
  Content: any
}

export function UiDialog({ open, onClose, children }: UiDialogProps) {
  const [dialogModule, setDialogModule] = useState<DialogExports | null>(null)

  useEffect(() => {
    let active = true
    import('@radix-ui/react-dialog')
      .then((mod) => {
        if (!active) return
        setDialogModule({
          Root: mod.Root,
          Portal: mod.Portal,
          Overlay: mod.Overlay,
          Content: mod.Content
        })
      })
      .catch(() => {
        if (active) setDialogModule(null)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!open || dialogModule) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [dialogModule, onClose, open])

  if (!dialogModule) {
    if (!open) return null
    return (
      <div
        className="radix-dialog-overlay"
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose()
        }}
      >
        <section className="radix-dialog-content" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
          {children}
        </section>
      </div>
    )
  }

  const { Root, Portal, Overlay, Content } = dialogModule

  return (
    <Root open={open} onOpenChange={(next: boolean) => !next && onClose()}>
      <Portal>
        <Overlay className="radix-dialog-overlay" />
        <Content className="radix-dialog-content">{children}</Content>
      </Portal>
    </Root>
  )
}
