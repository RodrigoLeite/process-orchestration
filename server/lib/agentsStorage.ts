import fs from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';

function getTenantAgentsDir(tenantId?: string) {
  const basePath = path.join(process.cwd(), 'server', 'data', 'agents');
  if (tenantId) {
    return path.join(basePath, tenantId);
  }
  return basePath;
}

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
  tenantId?: string;
  graph: AgentGraph;
  createdAt: string;
  updatedAt: string;
}

async function ensureDir(tenantId?: string) {
  const dir = getTenantAgentsDir(tenantId);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

/**
 * Create default agents for a new tenant
 * Called when a new workspace is created
 */
export async function createDefaultAgentsForTenant(tenantId: string): Promise<void> {
  console.log(`[AGENTS STORAGE] Creating default agents for tenant: ${tenantId}`);
  
  const defaultAgents = [
    {
      agentId: "workflow-generator",
      name: "Gerador de Workflow",
      description: "Gera workflows customizados para demandas",
      temperature: 0.7,
      model: "gpt-4-turbo"
    },
    {
      agentId: "bottleneck-detector",
      name: "Detector de Gargalos",
      description: "Detecta gargalos potenciais em workflows",
      temperature: 0.7,
      model: "gpt-4-turbo"
    },
    {
      agentId: "insights-ai",
      name: "Gerador de Insights",
      description: "Gera insights e recomendações baseados em dados",
      temperature: 0.7,
      model: "gpt-4-turbo"
    }
  ];
  
  for (const agent of defaultAgents) {
    try {
      // Check if agent already exists
      const existing = await loadAgent(agent.agentId, tenantId);
      if (existing?.graph?.nodes?.length > 0) {
        console.log(`[AGENTS STORAGE] Agent ${agent.agentId} already exists for tenant ${tenantId}`);
        continue;
      }
      
      // Create default graph structure
      const defaultGraph: AgentGraph = {
        nodes: [
          {
            id: "input-1",
            type: "chatInput",
            position: { x: 100, y: 200 },
            data: {
              label: "Entrada",
              description: "Entrada de dados para o agente"
            }
          },
          {
            id: "agent-1",
            type: "agent",
            position: { x: 350, y: 200 },
            data: {
              label: agent.name,
              description: agent.description,
              temperature: agent.temperature,
              modelName: agent.model,
              modelProvider: "OpenAI"
            }
          },
          {
            id: "output-1",
            type: "output",
            position: { x: 600, y: 200 },
            data: {
              label: "Saída",
              description: "Resultado do agente"
            }
          }
        ],
        edges: [
          { id: "e1-2", source: "input-1", target: "agent-1" },
          { id: "e2-3", source: "agent-1", target: "output-1" }
        ],
        viewport: { x: 0, y: 0, zoom: 1 }
      };
      
      await saveAgent(agent.agentId, defaultGraph, tenantId);
      console.log(`[AGENTS STORAGE] Created default agent: ${agent.agentId} for tenant ${tenantId}`);
    } catch (error) {
      console.error(`[AGENTS STORAGE] Error creating default agent ${agent.agentId}:`, error);
    }
  }
  
  console.log(`[AGENTS STORAGE] Default agents created for tenant: ${tenantId}`);
}

export async function saveAgent(agentId: string, graph: AgentGraph, tenantId?: string): Promise<AgentStorage> {
  await ensureDir(tenantId);
  
  const storage: AgentStorage = {
    agentId,
    tenantId,
    graph,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const dir = getTenantAgentsDir(tenantId);
  const filepath = path.join(dir, `${agentId}.json`);
  await fs.writeFile(filepath, JSON.stringify(storage, null, 2), 'utf-8');
  
  return storage;
}

export async function loadAgent(agentId: string, tenantId?: string): Promise<AgentStorage | null> {
  await ensureDir(tenantId);
  
  const dir = getTenantAgentsDir(tenantId);
  const filepath = path.join(dir, `${agentId}.json`);
  
  try {
    const data = await fs.readFile(filepath, 'utf-8');
    const parsed = JSON.parse(data);
    
    // Only set default model name if not specified (don't override user choices)
    if (parsed.graph?.nodes) {
      parsed.graph.nodes = parsed.graph.nodes.map((node: any) => {
        if (node.type === 'agent' && !node.data?.modelName) {
          return {
            ...node,
            data: {
              ...node.data,
              modelName: 'gpt-4o-mini',
              modelProvider: 'OpenAI'
            }
          };
        }
        return node;
      });
    }
    
    console.log(`[AGENTS STORAGE] Loaded agent: ${agentId}, nodes: ${parsed.graph?.nodes?.length || 0}`);
    return parsed;
  } catch (error: any) {
    // Fallback: try loading from root agents directory (for backward compatibility)
    if (tenantId) {
      try {
        const fallbackDir = getTenantAgentsDir(); // root directory
        const fallbackPath = path.join(fallbackDir, `${agentId}.json`);
        const data = await fs.readFile(fallbackPath, 'utf-8');
        const parsed = JSON.parse(data);
        
        if (parsed.graph?.nodes) {
          parsed.graph.nodes = parsed.graph.nodes.map((node: any) => {
            if (node.type === 'agent' && !node.data?.modelName) {
              return {
                ...node,
                data: {
                  ...node.data,
                  modelName: 'gpt-4o-mini',
                  modelProvider: 'OpenAI'
                }
              };
            }
            return node;
          });
        }
        
        console.log(`[AGENTS STORAGE] Loaded agent from fallback: ${agentId}, nodes: ${parsed.graph?.nodes?.length || 0}`);
        return parsed;
      } catch (fallbackError: any) {
        // Only log as error if it's not a "file not found" error
        if (fallbackError.code !== 'ENOENT') {
          console.error(`[AGENTS STORAGE] Error loading agent ${agentId} from fallback:`, fallbackError);
        }
      }
    }
    
    // Only log as error if it's not a "file not found" error - otherwise use defaults silently
    if (error.code !== 'ENOENT') {
      console.error(`[AGENTS STORAGE] Error loading agent ${agentId}:`, error);
    }
    
    // Return null to indicate no saved config (caller will use defaults)
    return null;
  }
}

/**
 * Load agent configurations for the orchestration graph
 * Returns combined config from all saved agents (workflow-generator, bottleneck-detector, insights-ai)
 */
export async function loadGraphAgentConfigs(tenantId?: string): Promise<{
  temperature: number;
  model: string;
  workflowBuilder?: { temperature: number; model: string };
  bottleneckDetector?: { temperature: number; model: string };
  insightsGenerator?: { temperature: number; model: string };
}> {
  const defaultConfig = { temperature: 0.7, model: "gpt-4-turbo" };
  
  try {
    // Load workflow generator config
    let workflowConfig = { ...defaultConfig };
    const workflowAgent = await loadAgent("workflow-generator", tenantId);
    if (workflowAgent?.graph?.nodes) {
      const agentNode = workflowAgent.graph.nodes.find((n: any) => n.type === "agent");
      if (agentNode?.data) {
        workflowConfig = {
          temperature: agentNode.data.temperature ?? 0.7,
          model: agentNode.data.modelName || "gpt-4-turbo"
        };
      }
    }
    
    // Load bottleneck detector config (Agent Studio uses "monitor-gargalos")
    let bottleneckConfig = { ...defaultConfig };
    const bottleneckAgent = await loadAgent("monitor-gargalos", tenantId);
    if (bottleneckAgent?.graph?.nodes) {
      const agentNode = bottleneckAgent.graph.nodes.find((n: any) => n.type === "agent");
      if (agentNode?.data) {
        bottleneckConfig = {
          temperature: agentNode.data.temperature ?? 0.7,
          model: agentNode.data.modelName || "gpt-4-turbo"
        };
      }
    }
    
    // Load insights generator config (Agent Studio uses "insights-inteligentes")
    let insightsConfig = { ...defaultConfig };
    const insightsAgent = await loadAgent("insights-inteligentes", tenantId);
    if (insightsAgent?.graph?.nodes) {
      const agentNode = insightsAgent.graph.nodes.find((n: any) => n.type === "agent");
      if (agentNode?.data) {
        insightsConfig = {
          temperature: agentNode.data.temperature ?? 0.7,
          model: agentNode.data.modelName || "gpt-4-turbo"
        };
      }
    }
    
    console.log(`[AGENTS STORAGE] Loaded graph configs - workflow: ${workflowConfig.model}, bottleneck: ${bottleneckConfig.model}, insights: ${insightsConfig.model}`);
    
    return {
      ...workflowConfig, // Use workflow config as default
      workflowBuilder: workflowConfig,
      bottleneckDetector: bottleneckConfig,
      insightsGenerator: insightsConfig
    };
  } catch (error) {
    console.warn(`[AGENTS STORAGE] Error loading graph configs, using defaults:`, error);
    return defaultConfig;
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

export async function executeAgent(agentId: string, graph: AgentGraph, initialInput?: string, tenantId?: string) {
  const startTime = Date.now();
  const traces: any[] = [];
  const nodeOutputs = new Map<string, any>();
  let finalOutput: any = null;
  let lastPromptOutput: any = null; // Track last prompt output for final result
  let totalTokensUsed = 0;

  try {
    console.log(`[AGENTS] Executing agent ${agentId}, initialInput:`, initialInput ? `"${initialInput.substring(0, 50)}..."` : 'undefined');
    
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
              parsedBody = nodeInput;
            } else {
              // Otherwise, template-replace "PLACEHOLDER" or "input" with actual input
              let bodyStr = bodyTemplate;
              
              // Replace PLACEHOLDER with the actual input (properly quoted)
              if (bodyStr.includes('PLACEHOLDER')) {
                if (typeof nodeInput === 'string') {
                  bodyStr = bodyStr.replace('"PLACEHOLDER"', JSON.stringify(nodeInput));
                } else if (typeof nodeInput === 'object') {
                  // If input is an object, just use its JSON stringified value
                  bodyStr = bodyStr.replace('"PLACEHOLDER"', JSON.stringify(nodeInput));
                } else {
                  bodyStr = bodyStr.replace('"PLACEHOLDER"', JSON.stringify(nodeInput));
                }
              }
              // Also support "input" placeholder for backwards compatibility
              else if (bodyStr.includes('"input"')) {
                if (typeof nodeInput === 'string') {
                  bodyStr = bodyStr.replace('"input"', JSON.stringify(nodeInput));
                } else {
                  bodyStr = bodyStr.replace('"input"', JSON.stringify(nodeInput));
                }
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
