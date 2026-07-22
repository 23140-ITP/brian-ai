import { BrainCircuit, Check, ChevronsUpDown, CircleUserRound, Database, FlaskConical, Settings } from 'lucide-react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { navigationSections } from './navigation'
import { WorkspaceId, workspaceOptions } from '@/lib/workspace'
import { useAppStore } from '@/store/appStore'
import { getWriteToken } from '@/services/api'

export function AppSidebar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { isMobile, setOpenMobile, state } = useSidebar()
  const { workspace, setWorkspace } = useAppStore()

  const closeMobileSidebar = () => setOpenMobile(false)
  const selectWorkspace = (next: WorkspaceId) => {
    setWorkspace(next)
    closeMobileSidebar()
    if (next === 'live' && !getWriteToken()) navigate('/settings')
  }

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="flex-row items-center gap-1">
        {(state === 'expanded' || isMobile) && (
          <SidebarMenu className="min-w-0 flex-1">
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild tooltip="Brian AI">
                <NavLink to="/app" onClick={closeMobileSidebar}>
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <BrainCircuit />
                  </span>
                  <span className="grid min-w-0 flex-1 text-left leading-tight">
                    <span className="truncate font-semibold">Brian AI</span>
                    <span className="truncate text-xs text-muted-foreground">Bharat Refinery</span>
                  </span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
        <SidebarTrigger className="ml-auto shrink-0" />
      </SidebarHeader>
      <SidebarContent>
        {navigationSections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map(({ to, label, icon: Icon }) => (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === to}
                      tooltip={label}
                    >
                      <NavLink to={to} end={to === '/app'} onClick={closeMobileSidebar}>
                        <Icon />
                        <span>{label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
                  <Avatar size="sm">
                    <AvatarFallback>{workspace === 'live' ? 'LV' : 'DM'}</AvatarFallback>
                  </Avatar>
                  <span className="grid min-w-0 flex-1 text-left leading-tight">
                    <span className="truncate font-medium">{workspace === 'live' ? 'Live workspace' : 'Demo workspace'}</span>
                    <span className="truncate text-xs text-muted-foreground">{workspace === 'live' ? 'Your evidence' : 'Seeded refinery data'}</span>
                  </span>
                  <ChevronsUpDown className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="w-56">
                <DropdownMenuLabel>Workspace</DropdownMenuLabel>
                <DropdownMenuGroup>
                  {workspaceOptions.map((option) => (
                    <DropdownMenuItem key={option.value} onSelect={() => selectWorkspace(option.value as WorkspaceId)}>
                      {option.value === 'live' ? <Database /> : <FlaskConical />}
                      <span className="flex-1">{option.label}</span>
                      {workspace === option.value && <Check />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onSelect={() => {
                      closeMobileSidebar()
                      navigate('/settings')
                    }}
                  >
                    <Settings />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      closeMobileSidebar()
                      navigate('/field')
                    }}
                  >
                    <CircleUserRound />
                    Field Mode
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
