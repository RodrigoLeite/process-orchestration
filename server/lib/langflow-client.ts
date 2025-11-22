/**
 * LangFlow Client - Gateway for LangFlow integrations
 * Handles validation, compilation, and execution of LangFlow agents
 */

export interface LangFlowStructure {
  nodes?: Array<{ id: string; type: string; [key: string]: any }>;
  edges?: Array<{ source: string; target: string; [key: string]: any }>;
  [key: string]: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface CompilationResult {
  success: boolean;
  code?: string;
  error?: string;
}

export interface ExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  executionTime?: number;
}

/**
 * Validates LangFlow JSON structure
 */
export function validateFlowStructure(langflowJson: any): ValidationResult {
  const errors: string[] = [];

  if (!langflowJson) {
    errors.push("LangFlow JSON is required");
    return { valid: false, errors };
  }

  if (typeof langflowJson !== "object") {
    errors.push("LangFlow JSON must be an object");
    return { valid: false, errors };
  }

  // Check for essential flow structure
  if (!langflowJson.nodes && !langflowJson.flows) {
    errors.push("LangFlow JSON must contain 'nodes' or 'flows' property");
  }

  // Validate nodes if present
  if (langflowJson.nodes && Array.isArray(langflowJson.nodes)) {
    if (langflowJson.nodes.length === 0) {
      errors.push("Flow must contain at least one node");
    }

    langflowJson.nodes.forEach((node: any, idx: number) => {
      if (!node.id) {
        errors.push(`Node at index ${idx} is missing 'id' field`);
      }
      if (!node.type) {
        errors.push(`Node at index ${idx} is missing 'type' field`);
      }
    });
  }

  // Validate edges if present
  if (langflowJson.edges && Array.isArray(langflowJson.edges)) {
    langflowJson.edges.forEach((edge: any, idx: number) => {
      if (!edge.source) {
        errors.push(`Edge at index ${idx} is missing 'source' field`);
      }
      if (!edge.target) {
        errors.push(`Edge at index ${idx} is missing 'target' field`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Generates compiled code from LangFlow JSON
 * This is a template generator - in production, you'd call LangFlow API
 */
export function compileFlow(langflowJson: LangFlowStructure, agentName: string): CompilationResult {
  try {
    // Validate first
    const validation = validateFlowStructure(langflowJson);
    if (!validation.valid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join(", ")}`
      };
    }

    // Generate TypeScript code from flow structure
    const nodes = langflowJson.nodes || [];
    const edges = langflowJson.edges || [];

    let code = `
// Generated from LangFlow: ${agentName}
// Auto-generated code - do not edit manually

export async function execute(input: Record<string, any>): Promise<Record<string, any>> {
  const context = { ...input };
  
  try {
    // Process ${nodes.length} nodes in flow
`;

    // Add node processing logic
    nodes.forEach((node: any) => {
      code += `
    // Node: ${node.id} (type: ${node.type})
    if (context.flow === undefined) context.flow = [];
    context.flow.push({
      nodeId: "${node.id}",
      type: "${node.type}",
      data: context
    });
`;
    });

    code += `
    return context;
  } catch (error) {
    throw new Error(\`Flow execution failed: \${error instanceof Error ? error.message : String(error)}\`);
  }
}
`;

    return {
      success: true,
      code
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown compilation error"
    };
  }
}

/**
 * Executes compiled LangFlow code
 */
export async function executeCompiledAgent(
  compiledCode: string,
  input: Record<string, any>
): Promise<ExecutionResult> {
  try {
    const startTime = Date.now();

    // Create a safe execution context
    const executeFunction = new Function("input", `${compiledCode}\nreturn execute(input);`);
    const output = await executeFunction(input);

    const executionTime = Date.now() - startTime;

    return {
      success: true,
      output,
      executionTime
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown execution error"
    };
  }
}

/**
 * Sends flow to LangFlow API for validation/execution
 * In production, configure LANGFLOW_ENDPOINT and LANGFLOW_API_KEY
 */
export async function sendFlowToLangFlow(
  langflowJson: LangFlowStructure,
  apiKey?: string
): Promise<{ success: boolean; response?: any; error?: string }> {
  const endpoint = process.env.LANGFLOW_ENDPOINT || "http://localhost:7860";
  const key = apiKey || process.env.LANGFLOW_API_KEY;

  if (!key) {
    return {
      success: false,
      error: "LANGFLOW_API_KEY not configured. Set environment variable or provide apiKey parameter."
    };
  }

  try {
    const response = await fetch(`${endpoint}/api/v1/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify({
        flow: langflowJson,
        input: {},
        output: {}
      })
    });

    if (!response.ok) {
      return {
        success: false,
        error: `LangFlow API error: ${response.status} ${response.statusText}`
      };
    }

    const data = await response.json();
    return {
      success: true,
      response: data
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send flow to LangFlow API"
    };
  }
}

/**
 * Create next version of agent
 */
export function createNextVersion(currentVersion: number): number {
  return currentVersion + 1;
}
