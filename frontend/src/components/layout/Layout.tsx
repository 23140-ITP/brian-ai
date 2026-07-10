import { Outlet } from 'react-router-dom'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppHeader } from './AppHeader'
import { AppSidebar } from './AppSidebar'

export function Layout() {
  return (
    <SidebarProvider defaultOpen>
      <a
        href="#main-content"
        className="sr-only fixed top-2 left-2 z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only"
      >
        Skip to content
      </a>
      <AppSidebar />
      <SidebarInset className="min-w-0 overflow-hidden">
        <AppHeader />
        <div id="main-content" tabIndex={-1} className="flex min-w-0 flex-1 flex-col p-4 outline-none md:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
