import { create } from 'zustand';
import { Node, Edge } from 'reactflow';

export interface AgentNode extends Node {
  data: {
    label: string;
    [key: string]: any;
  };
}

export interface AgentGraph {
  nodes: AgentNode[];
  edges: Edge[];
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
}

export interface ExecutionTrace {
  nodeId: string;
  nodeName: string;
  status: 'pending' | 'executing' | 'success' | 'error';
  input: any;
  output: any;
  duration: number;
  timestamp: number;
  error?: string;
}

export interface ExecutionResult {
  success: boolean;
  traces: ExecutionTrace[];
  finalOutput: any;
  totalDuration: number;
  tokensUsed: number;
  startTime: number;
  endTime: number;
}

interface AgentsStore {
  currentAgentId: string | null;
  setCurrentAgentId: (id: string) => void;

  nodes: AgentNode[];
  edges: Edge[];
  setNodes: (nodes: AgentNode[]) => void;
  setEdges: (edges: Edge[]) => void;
  updateNode: (nodeId: string, nodeData: any) => void;

  viewport: { x: number; y: number; zoom: number };
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void;

  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  isSaving: boolean;
  setIsSaving: (saving: boolean) => void;

  isExecuting: boolean;
  setIsExecuting: (executing: boolean) => void;

  executionResult: ExecutionResult | null;
  setExecutionResult: (result: ExecutionResult | null) => void;

  error: string | null;
  setError: (error: string | null) => void;

  unsavedChanges: boolean;
  setUnsavedChanges: (unsaved: boolean) => void;

  undo: () => void;
  redo: () => void;

  saveGraph: () => Promise<void>;
  loadGraph: (agentId: string) => Promise<void>;
  executeGraph: () => Promise<void>;

  history: AgentGraph[];
  historyIndex: number;
}

const EMPTY_GRAPH: AgentGraph = {
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
};

export const useAgentsStore = create<AgentsStore>((set, get) => ({
  currentAgentId: null,
  setCurrentAgentId: (id) => set({ currentAgentId: id }),

  nodes: [],
  edges: [],
  setNodes: (nodes) => {
    const state = get();
    const newGraph: AgentGraph = {
      nodes,
      edges: state.edges,
      viewport: state.viewport,
    };
    set((prev) => ({
      nodes,
      unsavedChanges: true,
      history: [...prev.history.slice(0, prev.historyIndex + 1), newGraph],
      historyIndex: prev.historyIndex + 1,
    }));
  },

  updateNode: (nodeId, nodeData) => {
    const state = get();
    const updatedNodes = state.nodes.map((n) =>
      n.id === nodeId ? { ...n, data: { ...n.data, ...nodeData } } : n
    );
    const newGraph: AgentGraph = {
      nodes: updatedNodes,
      edges: state.edges,
      viewport: state.viewport,
    };
    set((prev) => ({
      nodes: updatedNodes,
      unsavedChanges: true,
      history: [...prev.history.slice(0, prev.historyIndex + 1), newGraph],
      historyIndex: prev.historyIndex + 1,
    }));
  },

  setEdges: (edges) => {
    const state = get();
    const newGraph: AgentGraph = {
      nodes: state.nodes,
      edges,
      viewport: state.viewport,
    };
    set((prev) => ({
      edges,
      unsavedChanges: true,
      history: [...prev.history.slice(0, prev.historyIndex + 1), newGraph],
      historyIndex: prev.historyIndex + 1,
    }));
  },

  viewport: { x: 0, y: 0, zoom: 1 },
  setViewport: (viewport) => set({ viewport }),

  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),

  isSaving: false,
  setIsSaving: (saving) => set({ isSaving: saving }),

  isExecuting: false,
  setIsExecuting: (executing) => set({ isExecuting: executing }),

  executionResult: null,
  setExecutionResult: (result) => set({ executionResult: result }),

  error: null,
  setError: (error) => set({ error }),

  unsavedChanges: false,
  setUnsavedChanges: (unsaved) => set({ unsavedChanges: unsaved }),

  history: [EMPTY_GRAPH],
  historyIndex: 0,

  undo: () => {
    const state = get();
    if (state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1;
      const graph = state.history[newIndex];
      set({
        nodes: graph.nodes,
        edges: graph.edges,
        viewport: graph.viewport,
        historyIndex: newIndex,
      });
    }
  },

  redo: () => {
    const state = get();
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.historyIndex + 1;
      const graph = state.history[newIndex];
      set({
        nodes: graph.nodes,
        edges: graph.edges,
        viewport: graph.viewport,
        historyIndex: newIndex,
      });
    }
  },

  saveGraph: async () => {
    const state = get();
    if (!state.currentAgentId) return;

    set({ isSaving: true, error: null });
    try {
      const graph: AgentGraph = {
        nodes: state.nodes,
        edges: state.edges,
        viewport: state.viewport,
      };

      const response = await fetch('/api/agents/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: state.currentAgentId,
          graph,
        }),
      });

      if (!response.ok) throw new Error('Failed to save graph');
      set({ unsavedChanges: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Save failed' });
      throw err;
    } finally {
      set({ isSaving: false });
    }
  },

  loadGraph: async (agentId: string) => {
    set({ isLoading: true, error: null, currentAgentId: agentId });
    try {
      const response = await fetch(`/api/agents/load?agentId=${agentId}`);
      if (!response.ok) throw new Error('Failed to load graph');

      const { graph } = await response.json();
      const newGraph: AgentGraph = {
        nodes: graph.nodes || [],
        edges: graph.edges || [],
        viewport: graph.viewport || { x: 0, y: 0, zoom: 1 },
      };

      set({
        nodes: newGraph.nodes,
        edges: newGraph.edges,
        viewport: newGraph.viewport,
        history: [newGraph],
        historyIndex: 0,
        unsavedChanges: false,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Load failed' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  executeGraph: async () => {
    const state = get();
    if (!state.currentAgentId) return;

    set({ isExecuting: true, error: null });
    try {
      // Find ChatInputNode and get its value
      const chatNode = state.nodes.find((n: AgentNode) => n.type === 'chatInput');
      const initialInput = chatNode?.data?.value || '';

      const response = await fetch('/api/agents/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: state.currentAgentId,
          graph: {
            nodes: state.nodes,
            edges: state.edges,
          },
          initialInput, // Pass the user's input text
        }),
      });

      if (!response.ok) throw new Error('Execution failed');

      const result = await response.json();
      set({ executionResult: result });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Execution failed' });
      throw err;
    } finally {
      set({ isExecuting: false });
    }
  },
}));
