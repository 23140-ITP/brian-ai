export type WorkspaceId = 'demo' | 'live'

export const WORKSPACE_STORAGE_KEY = 'brian-ai-workspace'

export const workspaceOptions: Array<{ value: WorkspaceId; label: string; description: string }> = [
  { value: 'demo', label: 'Demo workspace', description: 'Seeded data with simulated actions' },
  { value: 'live', label: 'Live workspace', description: 'Your uploaded evidence and real results' },
]

export function readWorkspace(): WorkspaceId {
  try {
    return localStorage.getItem(WORKSPACE_STORAGE_KEY) === 'live' ? 'live' : 'demo'
  } catch {
    return 'demo'
  }
}

export function writeWorkspace(workspace: WorkspaceId) {
  try {
    localStorage.setItem(WORKSPACE_STORAGE_KEY, workspace)
  } catch {
    // The in-memory store still supports the current session.
  }
}
