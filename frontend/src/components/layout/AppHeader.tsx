import { useLocation, useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
import { useAppStore } from '@/store/appStore'
import { WorkspaceId, workspaceOptions } from '@/lib/workspace'
import { getWriteToken } from '@/services/api'
import { getNavigationItem } from './navigation'
import { SearchCommand } from './SearchCommand'
import { ThemeToggle } from './ThemeToggle'
import { SidebarTrigger } from '@/components/ui/sidebar'

const MODEL_OPTIONS = [
  { value: 'openrouter/free', label: 'OpenRouter Free' },
]

export function AppHeader() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { model, setModel, workspace, setWorkspace } = useAppStore()
  const current = getNavigationItem(pathname)
  const selectWorkspace = (value: string) => {
    const next = value as WorkspaceId
    setWorkspace(next)
    if (next === 'live' && !getWriteToken()) navigate('/settings')
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b bg-background/92 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/78 md:px-6">
      <SidebarTrigger className="lg:hidden" />
      <div className="hidden min-w-0 lg:block">
        <p className="truncate text-sm font-medium">{current.label}</p>
        <p className="truncate text-xs text-muted-foreground">{current.description}</p>
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        <SearchCommand />
        <Select value={workspace} onValueChange={selectWorkspace}>
          <SelectTrigger className="min-w-28 sm:min-w-40" aria-label="Select workspace">
            <SelectValue placeholder="Workspace" />
          </SelectTrigger>
          <SelectContent position="popper" align="end">
            <SelectGroup>
              {workspaceOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
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
                <AvatarFallback>{workspace === 'live' ? 'LV' : 'DM'}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>{workspace === 'live' ? 'Live workspace' : 'Demo workspace'}</DropdownMenuLabel>
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
