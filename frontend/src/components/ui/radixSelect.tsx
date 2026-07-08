import { Check, ChevronDown as RadixChevronDown } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

type SelectOption = {
  value: string
  label: string
}

type RadixSelectProps = {
  value: string
  options: SelectOption[]
  onValueChange: (value: string) => void
  ariaLabel: string
  id?: string
  className?: string
}

type SelectExports = {
  Root: any
  Trigger: any
  Value: any
  Icon?: any
  SelectIcon?: any
  Portal: any
  Content: any
  Viewport: any
  Item: any
  ItemText: any
  ItemIndicator: any
  SelectItem?: any
  SelectItemText?: any
  SelectItemIndicator?: any
}

export function RadixSelect({ value, options, onValueChange, ariaLabel, id, className }: RadixSelectProps) {
  const [selectModule, setSelectModule] = useState<SelectExports | null>(null)

  useEffect(() => {
    let active = true
    import('@radix-ui/react-select')
      .then((mod) => {
        if (!active) return
        setSelectModule({
          Root: mod.Root,
          Trigger: mod.SelectTrigger ?? mod.Trigger,
          Value: mod.SelectValue ?? mod.Value,
          Icon: mod.SelectIcon ?? mod.Icon,
          Portal: mod.Portal,
          Content: mod.SelectContent ?? mod.Content,
          Viewport: mod.SelectViewport ?? mod.Viewport,
          Item: mod.SelectItem ?? mod.Item,
          ItemText: mod.SelectItemText ?? mod.ItemText,
          ItemIndicator: mod.SelectItemIndicator ?? mod.ItemIndicator
        } as SelectExports)
      })
      .catch(() => {
        if (active) setSelectModule(null)
      })

    return () => {
      active = false
    }
  }, [])

  const fallbackOptions = useMemo(
    () => (
      <>
        {options.map((option) => (
          <option value={option.value} key={option.value} className="radix-select-item">
            {option.label}
          </option>
        ))}
      </>
    ),
    [options]
  )

  if (!selectModule) {
    return (
      <span className="radix-select-trigger">
        <select
          value={value}
          id={id}
          aria-label={ariaLabel}
          onChange={(event) => onValueChange(event.target.value)}
          className={`radix-select-viewport ${className || ''}`.trim()}
        >
          {fallbackOptions}
        </select>
        <span className="radix-select-content" aria-hidden="true">
          <RadixChevronDown size={16} />
        </span>
      </span>
    )
  }

  const {
    Root,
    Trigger,
    Value,
    Icon,
    Portal,
    Content,
    Viewport,
    Item,
    ItemText,
    ItemIndicator
  } = selectModule

  return (
    <Root value={value} onValueChange={onValueChange}>
      <div className="radix-select-root">
        <Trigger className="radix-select-trigger" aria-label={ariaLabel} id={id}>
          <Value placeholder={ariaLabel} />
          {Icon ? (
            <Icon asChild>
              <RadixChevronDown size={16} />
            </Icon>
          ) : (
            <RadixChevronDown size={16} />
          )}
        </Trigger>
        <Portal>
          <Content className="radix-select-content" position="popper" sideOffset={4} align="start">
            <Viewport className="radix-select-viewport">
              {options.map((option) => (
            <Item key={option.value} value={option.value} className="radix-select-item">
                  <ItemText>{option.label}</ItemText>
                  <ItemIndicator className="radix-select-item-indicator">
                    <Check size={14} aria-hidden="true" />
                  </ItemIndicator>
                </Item>
              ))}
            </Viewport>
          </Content>
        </Portal>
      </div>
    </Root>
  )
}
