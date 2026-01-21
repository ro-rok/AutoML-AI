import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SchemaColumn = {
  name: string;
  dtype: string;
  inferredType: 'numerical' | 'categorical' | 'boolean' | 'datetime' | 'unknown';
  nullCount: number;
  nullPercentage: number;
  sampleValues: any[];
  uniqueCount?: number;
  stats?: {
    mean: number;
    median: number;
    std: number;
    min: number;
    max: number;
    q25: number;
    q75: number;
    skewness: number;
  };
};

export type DatasetState = {
  originalRowCount: number;
  currentRowCount: number;
  originalColumnCount: number;
  currentColumnCount: number;
  cleaningOperations: any[];
  transformOperations: any[];
};

interface SessionState {
  // Session identification
  sessionId: string | null;
  setSessionId: (id: string) => void;
  
  // File metadata
  fileName: string;
  fileSize: number;
  setFileMetadata: (name: string, size: number) => void;
  
  // Schema
  schema: SchemaColumn[];
  setSchema: (schema: SchemaColumn[]) => void;
  
  // Target column
  targetColumn: string | null;
  setTargetColumn: (column: string | null) => void;
  
  // Dataset state
  datasetState: DatasetState | null;
  setDatasetState: (state: DatasetState) => void;
  
  // Preview data
  preview: any[];
  setPreview: (preview: any[]) => void;
  
  // Session expiration
  expiresAt: Date | null;
  setExpiresAt: (date: Date) => void;
  
  // Reset
  resetSession: () => void;
}

const initialState = {
  sessionId: null,
  fileName: '',
  fileSize: 0,
  schema: [],
  targetColumn: null,
  datasetState: null,
  preview: [],
  expiresAt: null,
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      ...initialState,
      
      setSessionId: (id) => set({ sessionId: id }),
      
      setFileMetadata: (name, size) => set({ fileName: name, fileSize: size }),
      
      setSchema: (schema) => set({ schema }),
      
      setTargetColumn: (column) => set({ targetColumn: column }),
      
      setDatasetState: (state) => set({ datasetState: state }),
      
      setPreview: (preview) => set({ preview }),
      
      setExpiresAt: (date) => set({ expiresAt: date }),
      
      resetSession: () => set(initialState),
    }),
    {
      name: 'automl-session-storage',
      partialize: (state) => ({
        sessionId: state.sessionId,
        fileName: state.fileName,
        targetColumn: state.targetColumn,
        expiresAt: state.expiresAt,
      }),
    }
  )
);

