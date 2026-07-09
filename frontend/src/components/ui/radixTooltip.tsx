import * as Tooltip from '@radix-ui/react-tooltip'
import { ReactNode } from 'react'

type UiTooltipProps = {
  content: ReactNode
  children: ReactNode
  delayDuration?: number
  side?: 'top' | 'right' | 'bottom' | 'left'
}

export function UiTooltip({ content, children, delayDuration = 200, side = 'top' }: UiTooltipProps) {
  return (
    <Tooltip.Provider delayDuration={0}>
      <Tooltip.Root delayDuration={delayDuration}>
        <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="radix-tooltip-content" side={side} sideOffset={5} align="center">
            {content}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  )
}
