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

// Helper to build execution order from nodes and edges (topological sort)
function getExecutionOrder(nodes: any[], edges: any[]): any[] {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const visited = new Set<string>();
  const result: any[] = [];

  function visit(nodeId: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (node) {
      result.push(node);
    }

    // Find outgoing edges (visit children/successors)
    const outgoingEdges = edges.filter(e => e.source === nodeId);
    outgoingEdges.forEach(edge => visit(edge.target));
  }

  // Start from nodes with no incoming edges (root/source nodes)
  const rootNodes = nodes.filter(node => {
    const hasIncomingEdge = edges.some(e => e.target === node.id);
    return !hasIncomingEdge;
  });
  
  rootNodes.forEach(node => {
    visit(node.id);
  });

  return result;
}

// Helper to get input data for a node from previous nodes
function getNodeInput(nodeId: string, nodeOutputs: Map<string, any>, edges: any[], initialInput?: string): any {
  const incomingEdges = edges.filter(e => e.target === nodeId);
  
  if (incomingEdges.length === 0) {
    // No incoming edges - use initialInput if provided
    if (initialInput) {
      return initialInput;
    }
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

export async function executeAgent(agentId: string, graph: AgentGraph, initialInput?: string) {
  const startTime = Date.now();
  const traces: any[] = [];
  const nodeOutputs = new Map<string, any>();
  let finalOutput: any = null;
  let lastPromptOutput: any = null; // Track last prompt output for final result
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
        nodeInput = getNodeInput(node.id, nodeOutputs, graph.edges, initialInput);

        if (node.type === 'chatInput') {
          // ChatInputNode - passes input through directly to next node
          nodeOutput = nodeInput;
        } else if (node.type === 'prompt') {
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

          // Save this as potential final output (will be overridden by OutputNode if present)
          try {
            lastPromptOutput = JSON.parse(response.choices[0]?.message?.content || '{}');
          } catch (e) {
            lastPromptOutput = { raw_response: response.choices[0]?.message?.content || '' };
          }

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
        } else if (node.type === 'agent') {
          // Execute AgentNode - orchestrate input through LLM with logic
          const { systemPrompt = '', temperature = 0.7, maxTokens = 2000, logicType = 'none', condition = '' } = node.data;

          if (!openaiApiKey) {
            throw new Error('OPENAI_API_KEY not configured');
          }

          // Apply logic if specified
          let processedInput = nodeInput;
          if (logicType === 'validation' && condition) {
            // Simple validation: check if input matches condition
            const inputStr = JSON.stringify(nodeInput);
            processedInput = {
              original: nodeInput,
              validationApplied: true,
              condition,
              passedValidation: inputStr.includes(condition),
            };
          } else if (logicType === 'filter') {
            processedInput = {
              original: nodeInput,
              filtered: true,
            };
          }

          // Call OpenAI with the processed input
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
                content: JSON.stringify(processedInput),
              },
            ],
          });

          const responseText = response.choices[0]?.message?.content || '';
          
          nodeOutput = {
            text: responseText,
            input: processedInput,
            temperature,
            logicApplied: logicType !== 'none',
            model: response.model,
            usage: {
              prompt_tokens: response.usage?.prompt_tokens || 0,
              completion_tokens: response.usage?.completion_tokens || 0,
              total_tokens: response.usage?.total_tokens || 0,
            },
          };

          // Save as potential final output
          try {
            lastPromptOutput = JSON.parse(responseText);
          } catch (e) {
            lastPromptOutput = { raw_response: responseText };
          }

          totalTokensUsed += response.usage?.total_tokens || 0;
        } else if (node.type === 'api') {
          // Execute APINode - make HTTP request
          const { endpoint = '', method = 'POST', headers = '{}', bodyTemplate = '{}' } = node.data;

          try {
            // Parse headers
            const parsedHeaders = JSON.parse(headers);
            
            // Handle body template
            let parsedBody: any;
            
            // If bodyTemplate is literally "input", use nodeInput directly
            if (bodyTemplate.trim() === 'input') {
              // If nodeInput is already an object with text (from AgentNode), extract and parse the text
              if (nodeInput && typeof nodeInput === 'object' && nodeInput.text) {
                try {
                  // Try to parse the text as JSON
                  parsedBody = JSON.parse(nodeInput.text);
                } catch (e) {
                  // If parsing fails, use nodeInput as-is
                  parsedBody = nodeInput;
                }
              } else {
                parsedBody = nodeInput;
              }
            } else {
              // Otherwise, template-replace "input" with actual input
              let bodyStr = bodyTemplate;
              if (typeof nodeInput === 'object') {
                bodyStr = bodyTemplate.replace(/"input"/g, JSON.stringify(nodeInput));
              } else {
                bodyStr = bodyTemplate.replace(/"input"/g, JSON.stringify(nodeInput));
              }
              parsedBody = JSON.parse(bodyStr);
            }

            // Make HTTP request
            const response = await fetch(`http://localhost:5000${endpoint}`, {
              method,
              headers: {
                'Content-Type': 'application/json',
                ...parsedHeaders,
              },
              body: method !== 'GET' ? JSON.stringify(parsedBody) : undefined,
            });

            const responseData = await response.json();
            
            nodeOutput = {
              endpoint,
              method,
              status: response.status,
              data: responseData,
            };

            // If response contains workflow data, extract and save as last output
            if (responseData && typeof responseData === 'object') {
              lastPromptOutput = responseData;
            }
          } catch (err) {
            throw new Error(`API call failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
        } else if (node.type === 'output') {
          // Execute OutputNode - format the output
          const { schema = '{}' } = node.data;

          try {
            const parsedSchema = JSON.parse(schema);
            
            // Try to parse the input (which should be the output from PromptNode)
            let parsedResult: any = nodeInput;
            if (typeof nodeInput === 'object' && nodeInput.text) {
              try {
                // If the input has a 'text' field (from PromptNode), try to parse it as JSON
                parsedResult = JSON.parse(nodeInput.text);
              } catch (e) {
                // If parsing fails, keep the raw text
                parsedResult = { raw_response: nodeInput.text };
              }
            }
            
            nodeOutput = {
              schema: parsedSchema,
              result: parsedResult,
              formatted: true,
            };

            // This is the final output - return the parsed result
            finalOutput = parsedResult;
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
      finalOutput: finalOutput || lastPromptOutput || {
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
