import { create } from 'zustand';

export type GraphType = 
  | 'correlation_heatmap'
  | 'histogram'
  | 'scatter'
  | 'confusion_matrix'
  | 'roc_curve'
  | 'feature_importance';

export type Graph = {
  id: string;
  type: GraphType;
  title: string;
  data: any;
  config?: any;
};

export type ViewerMode = 'inline' | 'modal' | 'split';

interface GraphState {
  // Active graphs
  graphs: Graph[];
  addGraph: (graph: Omit<Graph, 'id'>) => void;
  removeGraph: (id: string) => void;
  clearGraphs: () => void;
  
  // Viewer state
  viewerMode: ViewerMode;
  setViewerMode: (mode: ViewerMode) => void;
  
  // Active graph(s) in viewer
  activeGraphId: string | null;
  setActiveGraphId: (id: string | null) => void;
  
  // For split view comparison
  compareGraphId: string | null;
  setCompareGraphId: (id: string | null) => void;
  
  // Modal state
  isViewerOpen: boolean;
  openViewer: (graphId: string, mode?: ViewerMode) => void;
  closeViewer: () => void;
  
  // Preset views
  activePreset: 'overview' | 'distributions' | 'correlations' | null;
  setActivePreset: (preset: 'overview' | 'distributions' | 'correlations' | null) => void;
}

export const useGraphStore = create<GraphState>((set) => ({
  graphs: [],
  viewerMode: 'inline',
  activeGraphId: null,
  compareGraphId: null,
  isViewerOpen: false,
  activePreset: null,
  
  addGraph: (graph) => {
    const newGraph: Graph = {
      ...graph,
      id: `graph-${Date.now()}-${Math.random()}`,
    };
    set((state) => ({
      graphs: [...state.graphs, newGraph],
    }));
  },
  
  removeGraph: (id) => set((state) => ({
    graphs: state.graphs.filter((g) => g.id !== id),
  })),
  
  clearGraphs: () => set({ graphs: [] }),
  
  setViewerMode: (mode) => set({ viewerMode: mode }),
  
  setActiveGraphId: (id) => set({ activeGraphId: id }),
  
  setCompareGraphId: (id) => set({ compareGraphId: id }),
  
  openViewer: (graphId, mode = 'modal') => set({
    isViewerOpen: true,
    activeGraphId: graphId,
    viewerMode: mode,
  }),
  
  closeViewer: () => set({
    isViewerOpen: false,
    activeGraphId: null,
    compareGraphId: null,
  }),
  
  setActivePreset: (preset) => set({ activePreset: preset }),
}));
