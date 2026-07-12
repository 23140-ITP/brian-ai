import { create } from 'zustand'
import { readWorkspace, WorkspaceId, writeWorkspace } from '@/lib/workspace'

type AppState = {
  model: string
  activeDocumentId: string | null
  copilotDraftQuery: string
  sunlightMode: boolean
  workspace: WorkspaceId
  setModel: (model: string) => void
  setActiveDocumentId: (id: string | null) => void
  setCopilotDraftQuery: (query: string) => void
  setSunlightMode: (enabled: boolean) => void
  setWorkspace: (workspace: WorkspaceId) => void
}

export const useAppStore = create<AppState>((set) => ({
  model: 'openai/gpt-4o-mini',
  activeDocumentId: null,
  copilotDraftQuery: '',
  sunlightMode: false,
  workspace: readWorkspace(),
  setModel: (model) => set({ model }),
  setActiveDocumentId: (activeDocumentId) => set({ activeDocumentId }),
  setCopilotDraftQuery: (copilotDraftQuery) => set({ copilotDraftQuery }),
  setSunlightMode: (sunlightMode) => set({ sunlightMode }),
  setWorkspace: (workspace) => {
    writeWorkspace(workspace)
    set({ workspace, activeDocumentId: null, copilotDraftQuery: '' })
  }
}))
