import fs from 'fs/promises';
import path from 'path';

const AGENTS_DIR = path.join(process.cwd(), 'data', 'agents');

export interface AgentGraph {
  nodes: any[];
  edges: any[];
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
}

export interface AgentStorage {
  agentId: string;
  graph: AgentGraph;
  createdAt: string;
  updatedAt: string;
}

async function ensureDir() {
  try {
    await fs.access(AGENTS_DIR);
  } catch {
    await fs.mkdir(AGENTS_DIR, { recursive: true });
  }
}

export async function saveAgent(agentId: string, graph: AgentGraph): Promise<AgentStorage> {
  await ensureDir();
  
  const storage: AgentStorage = {
    agentId,
    graph,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const filepath = path.join(AGENTS_DIR, `${agentId}.json`);
  await fs.writeFile(filepath, JSON.stringify(storage, null, 2), 'utf-8');
  
  return storage;
}

export async function loadAgent(agentId: string): Promise<AgentStorage | null> {
  await ensureDir();
  
  const filepath = path.join(AGENTS_DIR, `${agentId}.json`);
  
  try {
    const data = await fs.readFile(filepath, 'utf-8');
    return JSON.parse(data);
  } catch {
    // Return empty graph if not found
    return {
      agentId,
      graph: {
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}

export async function executeAgent(agentId: string, graph: AgentGraph) {
  // Simulate agent execution
  const startTime = Date.now();
  const traces = [];

  for (const node of graph.nodes) {
    const nodeStartTime = Date.now();
    const duration = Math.random() * 100 + 50; // 50-150ms

    traces.push({
      nodeId: node.id,
      nodeName: node.data.label,
      status: 'success',
      input: { test: 'input' },
      output: { test: 'output' },
      duration,
      timestamp: nodeStartTime,
    });
  }

  const totalDuration = Date.now() - startTime;
  const tokensUsed = Math.floor(Math.random() * 500) + 100;

  return {
    success: true,
    traces,
    finalOutput: {
      result: 'Execução simulada completa',
      nodes: graph.nodes.length,
      edges: graph.edges.length,
    },
    totalDuration,
    tokensUsed,
    startTime,
    endTime: Date.now(),
  };
}
