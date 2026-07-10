import { CircleCheck } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useAppStore } from '@/store/appStore'
import { dataMode } from '@/services/api'
import { getNavigationItem } from './navigation'
import { SearchCommand } from './SearchCommand'
import { ThemeToggle } from './ThemeToggle'

const MODEL_OPTIONS = [
  { value: 'openai/gpt-4o-mini', label: 'GPT-4o mini' },
  { value: 'anthropic/claude-3.5-sonnet', label: 'Claude Sonnet' },
  { value: 'google/gemini-flash-1.5', label: 'Gemini Flash' },
]

export function AppHeader() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { model, setModel } = useAppStore()
  const current = getNavigationItem(pathname)

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b bg-background/92 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/78 md:px-6">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-5" />
      <div className="hidden min-w-0 lg:block">
        <p className="truncate text-sm font-medium">{current.label}</p>
        <p className="truncate text-xs text-muted-foreground">{current.description}</p>
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        <SearchCommand />
        <Badge variant="outline" className="hidden gap-1.5 lg:inline-flex">
          <CircleCheck data-icon="inline-start" />
          {dataMode === 'live' ? 'Live backend' : 'Demo data'}
        </Badge>
        <Select value={model} onValueChange={setModel}>
          <SelectTrigger className="hidden min-w-36 sm:flex" aria-label="Select AI model">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent position="popper" align="end">
            <SelectGroup>
              {MODEL_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Open workspace menu">
              <Avatar size="sm">
                <AvatarFallback>BR</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>Bharat Refinery</DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={() => navigate('/settings')}>Settings</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/field')}>Open Field Mode</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
