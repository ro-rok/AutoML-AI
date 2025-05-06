import { create } from 'zustand'

export type SchemaItem = {
  column: string
  dtype: string
  inferred_type: 'numerical' | 'categorical' | 'boolean' | 'datetime' | 'unknown'
  null_count: number
}

interface SessionState {
  sessionId: string
  setSessionId: (id: string) => void
  preview: any[]
  setPreview: (p: any[]) => void
  schema: SchemaItem[]
  setSchema: (s: SchemaItem[]) => void
  fileName: string
  setFileName: (name: string) => void
  resetSession: () => void
}

export const useSessionStore = create<SessionState>((set) => ({
  sessionId: '',
  setSessionId: (id) => set({ sessionId: id }),
  preview: [],
  setPreview: (preview) => set({ preview }),
  schema: [],
  setSchema: (schema) => set({ schema }),
  fileName: '',
  setFileName: (name) => set({ fileName: name }),
  resetSession: () => set({ sessionId: '', preview: [], schema: [], fileName: '' }),
}));
