import { TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { API_STATUS_EVENT, dataMode } from '@/services/api'
import { AppHeader } from './AppHeader'
import { AppSidebar } from './AppSidebar'

export function Layout() {
  const [apiIssue, setApiIssue] = useState(dataMode === 'demo' ? 'Bundled demo evidence is active; live backend results are not being used.' : '')

  useEffect(() => {
    const listener = (event: Event) => setApiIssue((event as CustomEvent<string>).detail)
    window.addEventListener(API_STATUS_EVENT, listener)
    return () => window.removeEventListener(API_STATUS_EVENT, listener)
  }, [])

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
          {apiIssue && (
            <Alert variant={dataMode === 'live' ? 'destructive' : 'default'} className="mb-4">
              <TriangleAlert aria-hidden="true" />
              <AlertTitle>{dataMode === 'live' ? 'Live backend unavailable' : 'Demo data mode'}</AlertTitle>
              <AlertDescription>{apiIssue}</AlertDescription>
            </Alert>
          )}
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
