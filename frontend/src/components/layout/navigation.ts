import {
  BarChart3,
  Bot,
  ClipboardCheck,
  FileText,
  GitBranch,
  Mic2,
  Settings,
  Smartphone,
  type LucideIcon,
} from 'lucide-react'

export type NavigationItem = {
  to: string
  label: string
  description: string
  icon: LucideIcon
}

export type NavigationSection = {
  label: string
  items: NavigationItem[]
}

export const navigationSections: NavigationSection[] = [
  {
    label: 'Intelligence',
    items: [
      { to: '/app', label: 'Dashboard', description: 'Operations overview', icon: BarChart3 },
      { to: '/copilot', label: 'AI Copilot', description: 'Ask refinery questions', icon: Bot },
      { to: '/knowledge-graph', label: 'Knowledge Graph', description: 'Trace linked evidence', icon: GitBranch },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/compliance', label: 'Compliance', description: 'Review clause readiness', icon: ClipboardCheck },
      { to: '/documents', label: 'Documents', description: 'Manage source files', icon: FileText },
      { to: '/capture', label: 'Expert Capture', description: 'Record field knowledge', icon: Mic2 },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/settings', label: 'Settings', description: 'Models and readiness', icon: Settings },
      { to: '/field', label: 'Field Mode', description: 'Mobile-first capture', icon: Smartphone },
    ],
  },
]

export const navigationItems = navigationSections.flatMap((section) => section.items)

export function getNavigationItem(pathname: string) {
  return navigationItems.find((item) => item.to === pathname) ?? navigationItems[0]
}
