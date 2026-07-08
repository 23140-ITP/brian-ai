import { create } from 'zustand'

type AppState = {
  model: string
  activeDocumentId: string | null
  copilotDraftQuery: string
  sunlightMode: boolean
  setModel: (model: string) => void
  setActiveDocumentId: (id: string | null) => void
  setCopilotDraftQuery: (query: string) => void
  setSunlightMode: (enabled: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  model: 'openai/gpt-4o-mini',
  activeDocumentId: null,
  copilotDraftQuery: '',
  sunlightMode: false,
  setModel: (model) => set({ model }),
  setActiveDocumentId: (activeDocumentId) => set({ activeDocumentId }),
  setCopilotDraftQuery: (copilotDraftQuery) => set({ copilotDraftQuery }),
  setSunlightMode: (sunlightMode) => set({ sunlightMode })
}))
