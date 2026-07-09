import * as Select from '@radix-ui/react-select'
import { Check, ChevronDown as RadixChevronDown } from 'lucide-react'

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

export function RadixSelect({ value, options, onValueChange, ariaLabel, id, className }: RadixSelectProps) {
  return (
    <Select.Root value={value} onValueChange={onValueChange}>
      <div className="radix-select-root">
        <Select.Trigger className={`radix-select-trigger ${className || ''}`.trim()} aria-label={ariaLabel} id={id}>
          <Select.Value placeholder={ariaLabel} />
          <Select.Icon asChild>
            <RadixChevronDown size={16} />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content className="radix-select-content" position="popper" sideOffset={4} align="start">
            <Select.Viewport className="radix-select-viewport">
              {options.map((option) => (
                <Select.Item key={option.value} value={option.value} className="radix-select-item">
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator className="radix-select-item-indicator">
                    <Check size={14} aria-hidden="true" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </div>
    </Select.Root>
  )
}
