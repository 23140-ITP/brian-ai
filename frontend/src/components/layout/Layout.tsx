import {
  BarChart3,
  Bot,
  BrainCircuit,
  ClipboardCheck,
  FileText,
  GitBranch,
  Mic2,
  Radar,
  Settings,
  Smartphone
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAppStore } from '../../store/appStore'
import { RadixSelect } from '../ui/radixSelect'

const navItems = [
  { to: '/', label: 'Dashboard', icon: BarChart3 },
  { to: '/copilot', label: 'AI Copilot', icon: Bot },
  { to: '/knowledge-graph', label: 'Knowledge Graph', icon: GitBranch },
  { to: '/compliance', label: 'Compliance', icon: ClipboardCheck },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/field', label: 'Field Mode', icon: Smartphone },
  { to: '/capture', label: 'Expert Capture', icon: Mic2 },
  { to: '/settings', label: 'Settings', icon: Settings }
]

const MODEL_OPTIONS = [
  { value: 'openai/gpt-4o-mini', label: 'GPT-4o mini' },
  { value: 'anthropic/claude-3.5-sonnet', label: 'Claude Sonnet' },
  { value: 'google/gemini-flash-1.5', label: 'Gemini Flash' }
]

export function Layout() {
  const { model, setModel } = useAppStore()

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><BrainCircuit size={24} /></div>
          <div>
            <strong>Brian AI</strong>
            <span>Bharat Refinery</span>
          </div>
        </div>
        <nav>
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => isActive ? 'active' : undefined}
              aria-label={label}
              title={label}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div>
            <p>Industrial Knowledge Intelligence</p>
            <strong>Bharat Refinery, Jamnagar</strong>
          </div>
          <div className="topbar-actions">
            <span className="live-dot"><Radar size={14} /> Live demo</span>
            <label htmlFor="topbar-model-select" className="sr-only">AI model</label>
            <RadixSelect
              value={model}
              options={MODEL_OPTIONS}
              onValueChange={setModel}
              ariaLabel="Select AI model"
              id="topbar-model-select"
            />
          </div>
        </header>
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
