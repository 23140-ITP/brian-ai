import { ReactNode, useEffect, useState } from 'react'

type UiTooltipProps = {
  content: ReactNode
  children: ReactNode
  delayDuration?: number
  side?: 'top' | 'right' | 'bottom' | 'left'
}

type TooltipExports = {
  Provider: any
  Root: any
  Trigger: any
  Portal: any
  Content: any
}

export function UiTooltip({ content, children, delayDuration = 200, side = 'top' }: UiTooltipProps) {
  const [tooltipModule, setTooltipModule] = useState<TooltipExports | null>(null)

  useEffect(() => {
    let active = true
    import('@radix-ui/react-tooltip')
      .then((mod) => {
        if (!active) return
        setTooltipModule({
          Provider: mod.Provider,
          Root: mod.Root,
          Trigger: mod.Trigger,
          Portal: mod.Portal,
          Content: mod.Content
        })
      })
      .catch(() => {
        if (active) setTooltipModule(null)
      })

    return () => {
      active = false
    }
  }, [])

  if (!tooltipModule) {
    return <span title={typeof content === 'string' ? content : ''}>{children}</span>
  }

  const { Provider, Root, Trigger, Portal, Content } = tooltipModule

  return (
    <Provider delayDuration={0}>
      <Root delayDuration={delayDuration}>
        <Trigger asChild>{children}</Trigger>
        <Portal>
          <Content className="radix-tooltip-content" side={side} sideOffset={5} align="center">
            {content}
          </Content>
        </Portal>
      </Root>
    </Provider>
  )
}

