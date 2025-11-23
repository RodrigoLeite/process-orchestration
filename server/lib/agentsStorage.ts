import fs from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';

const AGENTS_DIR = path.join(process.cwd(), 'server', 'data', 'agents');

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
    const parsed = JSON.parse(data);
    console.log(`[AGENTS STORAGE] Loaded agent: ${agentId}, nodes: ${parsed.graph?.nodes?.length || 0}`);
    return parsed;
  } catch (error) {
    console.error(`[AGENTS STORAGE] Error loading agent ${agentId}:`, error);
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

// Helper to build execution order from nodes and edges
function getExecutionOrder(nodes: any[], edges: any[]): any[] {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const visited = new Set<string>();
  const result: any[] = [];

  function visit(nodeId: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    // Find incoming edges
    const incomingEdges = edges.filter(e => e.target === nodeId);
    
    // Visit all source nodes first (topological sort)
    incomingEdges.forEach(edge => visit(edge.source));

    result.push(nodeMap.get(nodeId));
  }

  // Start from nodes with no incoming edges
  nodes.forEach(node => {
    const hasIncomingEdge = edges.some(e => e.target === node.id);
    if (!hasIncomingEdge) {
      visit(node.id);
    }
  });

  return result;
}

// Helper to get input data for a node from previous nodes
function getNodeInput(nodeId: string, nodeOutputs: Map<string, any>, edges: any[]): any {
  const incomingEdges = edges.filter(e => e.target === nodeId);
  
  if (incomingEdges.length === 0) {
    return { test: 'input' };
  }

  if (incomingEdges.length === 1) {
    const sourceId = incomingEdges[0].source;
    return nodeOutputs.get(sourceId) || {};
  }

  // Multiple inputs: merge them
  const merged: any = {};
  incomingEdges.forEach(edge => {
    const sourceId = edge.source;
    const data = nodeOutputs.get(sourceId) || {};
    Object.assign(merged, data);
  });

  return merged;
}

export async function executeAgent(agentId: string, graph: AgentGraph) {
  const startTime = Date.now();
  const traces: any[] = [];
  const nodeOutputs = new Map<string, any>();
  let finalOutput: any = null;
  let totalTokensUsed = 0;

  try {
    const executionOrder = getExecutionOrder(graph.nodes, graph.edges);
    const openaiApiKey = process.env.OPENAI_API_KEY;

    for (const node of executionOrder) {
      const nodeStartTime = Date.now();
      let nodeOutput: any = null;
      let nodeDuration = 0;
      let nodeStatus = 'success';
      let nodeError: string | undefined;
      let nodeInput: any;

      try {
        nodeInput = getNodeInput(node.id, nodeOutputs, graph.edges);

        if (node.type === 'prompt') {
          // Execute PromptNode - call OpenAI with the node's temperature
          const { systemPrompt = '', temperature = 0.7, maxTokens = 2000 } = node.data;

          if (!openaiApiKey) {
            throw new Error('OPENAI_API_KEY not configured');
          }

          const openai = new OpenAI({ apiKey: openaiApiKey });

          const response = await openai.chat.completions.create({
            model: 'gpt-4-turbo',
            temperature,
            max_tokens: maxTokens,
            messages: [
              {
                role: 'system',
                content: systemPrompt || 'You are a helpful assistant.',
              },
              {
                role: 'user',
                content: JSON.stringify(nodeInput),
              },
            ],
          });

          nodeOutput = {
            text: response.choices[0]?.message?.content || '',
            input: nodeInput,
            temperature,
            model: response.model,
            usage: {
              prompt_tokens: response.usage?.prompt_tokens || 0,
              completion_tokens: response.usage?.completion_tokens || 0,
              total_tokens: response.usage?.total_tokens || 0,
            },
          };

          totalTokensUsed += response.usage?.total_tokens || 0;
        } else if (node.type === 'logic') {
          // Execute LogicNode - process the condition/logic
          const { logicType = 'filter', condition = '' } = node.data;

          nodeOutput = {
            logicType,
            condition,
            input: nodeInput,
            result: 'logic_executed',
          };

          // For now, logic execution is simplified. In production, you'd parse and execute the condition
          if (logicType === 'filter') {
            nodeOutput.filtered = true;
            nodeOutput.passedFilter = true;
          } else if (logicType === 'routing') {
            nodeOutput.routedTo = 'default_path';
          }
        } else if (node.type === 'output') {
          // Execute OutputNode - format the output
          const { schema = '{}' } = node.data;

          try {
            const parsedSchema = JSON.parse(schema);
            nodeOutput = {
              schema: parsedSchema,
              input: nodeInput,
              formatted: true,
            };

            // This is the final output
            finalOutput = nodeOutput;
          } catch (e) {
            nodeOutput = {
              schema: {},
              input: nodeInput,
              formatted: false,
              error: 'Invalid schema JSON',
            };
          }
        } else {
          // Unknown node type
          nodeOutput = {
            type: node.type,
            input: nodeInput,
            message: 'Unknown node type',
          };
        }

        nodeDuration = Date.now() - nodeStartTime;
      } catch (error) {
        nodeStatus = 'error';
        nodeError = error instanceof Error ? error.message : 'Unknown error';
        nodeOutput = { error: nodeError, input: nodeInput };
        nodeDuration = Date.now() - nodeStartTime;
      }

      // Store output for next nodes
      nodeOutputs.set(node.id, nodeOutput);

      // Record trace
      traces.push({
        nodeId: node.id,
        nodeName: node.data.label || node.id,
        status: nodeStatus,
        input: nodeInput,
        output: nodeOutput,
        duration: nodeDuration,
        timestamp: nodeStartTime,
        error: nodeError,
      });
    }

    const totalDuration = Date.now() - startTime;

    return {
      success: true,
      traces,
      finalOutput: finalOutput || {
        message: 'Execution completed',
        nodesExecuted: graph.nodes.length,
      },
      totalDuration,
      tokensUsed: totalTokensUsed,
      startTime,
      endTime: Date.now(),
    };
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return {
      success: false,
      traces,
      finalOutput: {
        error: errorMessage,
      },
      totalDuration,
      tokensUsed: totalTokensUsed,
      startTime,
      endTime: Date.now(),
    };
  }
}
