import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command'
import { navigationSections } from './navigation'

export function SearchCommand() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((current) => !current)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const goTo = (to: string) => {
    setOpen(false)
    navigate(to)
  }

  return (
    <>
      <Button
        variant="outline"
        className="hidden min-w-56 justify-start text-muted-foreground md:inline-flex"
        onClick={() => setOpen(true)}
      >
        <Search data-icon="inline-start" />
        Search workflows
        <span className="ml-auto rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          Ctrl K
        </span>
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Search workflows"
      >
        <Search />
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Navigate Brian AI"
        description="Search routes and workflows"
      >
        <Command>
          <CommandInput placeholder="Search workflows..." />
          <CommandList>
            <CommandEmpty>No workflow found.</CommandEmpty>
            {navigationSections.map((section) => (
              <CommandGroup key={section.label} heading={section.label}>
                {section.items.map(({ to, label, description, icon: Icon }) => (
                  <CommandItem key={to} value={`${label} ${description}`} onSelect={() => goTo(to)}>
                    <Icon />
                    <div className="flex flex-1 flex-col gap-0.5">
                      <span>{label}</span>
                      <span className="text-xs text-muted-foreground">{description}</span>
                    </div>
                    <CommandShortcut>Open</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
