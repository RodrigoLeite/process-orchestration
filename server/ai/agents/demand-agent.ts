import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { withTracing, logAgentExecution } from "../../lib/ai/lc/telemetry";

/**
 * DemandAgent - Interprets user demands and extracts structured data
 */

// Schema for validated demand extraction
const DemandSchema = z.object({
  titulo: z.string().describe("Demand title"),
  descricao: z.string().describe("Demand description"),
  area: z.string().describe("Department/area (TECH, SALES, HR, etc)"),
  urgencia: z.enum(["baixa", "média", "alta", "crítica"]).describe("Urgency level"),
  resultadosEsperados: z.array(z.string()).describe("Expected outcomes/deliverables"),
  slaHoras: z.number().optional().describe("SLA in hours if applicable")
});

export type DemandInput = z.infer<typeof DemandSchema>;

export interface DemandAgentInput {
  texto: string; // Raw user input
  contexto?: Record<string, any>;
}

export interface DemandAgentOutput {
  success: boolean;
  demanda?: DemandInput;
  error?: string;
  reasoning?: string;
}

/**
 * Initialize LLM client for demand analysis
 */
function initializeLLM(): ChatOpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is required");
  }

  return new ChatOpenAI({
    apiKey,
    modelName: "gpt-4-turbo",
    temperature: 0.7,
    maxTokens: 1024
  });
}

/**
 * Extract structured demand from user input
 */
export async function demandAgent(input: DemandAgentInput): Promise<DemandAgentOutput> {
  const startTime = Date.now();
  
  return withTracing("demandAgent", async () => {
    try {
      const llm = initializeLLM();

    const systemPrompt = `You are an expert demand analyst for a business process management system.
Your task is to interpret user requests and extract structured demand information.
Always respond with valid JSON that matches this schema:
{
  "titulo": "string",
  "descricao": "string",
  "area": "string (TECH, SALES, HR, FINANCE, OPERATIONS, etc)",
  "urgencia": "enum (baixa, média, alta, crítica)",
  "resultadosEsperados": ["string array of expected outcomes"],
  "slaHoras": optional number
}

Guidelines:
- Infer missing information from context clues
- Set urgencia to "crítica" if keywords like "urgent", "emergency", "down", "broken" are present
- Map business areas correctly
- Generate 2-4 realistic expected outcomes
- Set SLA based on urgency (crítica: 4h, alta: 8h, média: 24h, baixa: 72h)`;

    const userPrompt = `Extract demand information from this user input:
"${input.texto}"

${input.contexto ? `Additional context: ${JSON.stringify(input.contexto)}` : ""}

Respond ONLY with valid JSON matching the schema. No markdown, no explanation.`;

    const response = await llm.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]);

    const responseText = typeof response.content === "string" 
      ? response.content 
      : String(response.content);

    // Parse JSON response
    let demandData;
    try {
      demandData = JSON.parse(responseText);
    } catch {
      // Try to extract JSON from response if wrapped in markdown
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Could not extract JSON from response");
      }
      demandData = JSON.parse(jsonMatch[0]);
    }

    // Validate with Zod schema
    const validated = DemandSchema.parse(demandData);

    const result = {
      success: true,
      demanda: validated,
      reasoning: `Extracted demand: "${validated.titulo}" (Area: ${validated.area}, Urgency: ${validated.urgencia})`
    };

    // Log to telemetry
    const duration = Date.now() - startTime;
    await logAgentExecution("demandAgent", input, result, { agent_type: "demand" }, duration);

    return result;
    } catch (error) {
      const result = {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };

      const duration = Date.now() - startTime;
      await logAgentExecution("demandAgent", input, result, { agent_type: "demand" }, duration);

      return result;
    }
  }, { agent_type: "demand", input_text: input.texto.slice(0, 100) });
}

/**
 * Batch process multiple demand inputs
 */
export async function processDemandBatch(
  inputs: DemandAgentInput[]
): Promise<DemandAgentOutput[]> {
  return Promise.all(inputs.map(input => demandAgent(input)));
}
