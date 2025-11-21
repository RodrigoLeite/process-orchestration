import OpenAI from "openai";

export const SYSTEM_PROMPT = `You are an AI Process Orchestrator specialized in classifying and structuring internal business demands between departments in medium and large companies.

Your role is to:
1. Interpret raw human input (e-mails, mensagens, tickets internos, pedidos informais).
2. Classify the demand according to the internal department responsible.
3. Determine the type of the request.
4. Assign an objective priority level.
5. Transform the message into a structured, normalized JSON object.
6. Suggest a next step appropriate to the responsible area.

OUTPUT RULES (CRITICAL):
- Output MUST be valid JSON. No markdown, no explanations, no extra text.
- Only the fields below are allowed.
- Never invent new fields.
- Never output comments.
- If information is missing, infer the best possible value based on enterprise behavior.

VALID AREAS:
- TI
- Financeiro
- RH
- Operações
- Vendas
- Jurídico
- Facilities

VALID TYPES:
- incidente
- solicitação
- revisão
- aprovação
- informação

VALID PRIORITIES:
- baixa
- média
- alta
- crítica

FINAL JSON FORMAT:
{
  "area": "...",
  "tipo": "...",
  "prioridade": "...",
  "descricao_estruturada": "...",
  "sugestao_proximo_passo": "..."
}

SYSTEM BEHAVIOR:
- You must rewrite the description as a concise, objective summary of the demand.
- You must infer the priority according to risk × impacto.
- You must infer the correct area even if the user does not state it explicitly.
- Use enterprise logic:
  - contratos → Jurídico
  - app caiu / servidor / erros → TI
  - pessoas / contratação / férias → RH
  - faturas, boletos, pagamentos → Financeiro
  - operação travada, cadeia produtiva, logística → Operações
  - aprovação de desconto, cliente, pedido → Vendas
  - instalações, manutenção, ar-condicionado → Facilities

Never break JSON format for any reason.`;

const FEW_SHOT_EXAMPLES = [
  {
    role: "user",
    content: "Precisamos ativar o novo cliente ACME, emitir contrato e provisionar o e-mail deles."
  },
  {
    role: "assistant",
    content: JSON.stringify({
      area: "Vendas",
      tipo: "solicitação",
      prioridade: "alta",
      descricao_estruturada: "Ativação de novo cliente ACME com emissão de contrato e provisionamento de e-mail.",
      sugestao_proximo_passo: "Coletar dados cadastrais e iniciar fluxo no jurídico."
    })
  },
  {
    role: "user",
    content: "Financeiro pediu para rever o preço especial, validar o desconto e emitir nota."
  },
  {
    role: "assistant",
    content: JSON.stringify({
      area: "Financeiro",
      tipo: "revisão",
      prioridade: "média",
      descricao_estruturada: "Revisão de preço especial e validação de desconto para emissão de nota.",
      sugestao_proximo_passo: "Validar margem de desconto com a diretoria."
    })
  },
  {
    role: "user",
    content: "O RH precisa criar o acesso do novo analista e enviar o contrato para assinatura."
  },
  {
    role: "assistant",
    content: JSON.stringify({
      area: "RH",
      tipo: "solicitação",
      prioridade: "média",
      descricao_estruturada: "Criação de acesso para novo analista e envio de contrato.",
      sugestao_proximo_passo: "Solicitar dados do colaborador para TI."
    })
  },
  {
    role: "user",
    content: "Cliente reclamou do atraso na entrega, precisamos investigar e responder."
  },
  {
    role: "assistant",
    content: JSON.stringify({
      area: "Operações",
      tipo: "incidente",
      prioridade: "alta",
      descricao_estruturada: "Reclamação de cliente sobre atraso na entrega.",
      sugestao_proximo_passo: "Rastrear pedido e contatar transportadora."
    })
  },
  {
    role: "user",
    content: "Precisamos cancelar o acesso do funcionário desligado hoje, pode desativar tudo."
  },
  {
    role: "assistant",
    content: JSON.stringify({
      area: "TI",
      tipo: "solicitação",
      prioridade: "alta",
      descricao_estruturada: "Cancelamento urgente de acessos de funcionário desligado.",
      sugestao_proximo_passo: "Bloquear contas de rede e e-mail imediatamente."
    })
  },
  {
    role: "user",
    content: "Temos que atualizar o cadastro do fornecedor e reenviar contrato revisado."
  },
  {
    role: "assistant",
    content: JSON.stringify({
      area: "Jurídico",
      tipo: "revisão",
      prioridade: "baixa",
      descricao_estruturada: "Atualização de cadastro de fornecedor e revisão de contrato.",
      sugestao_proximo_passo: "Solicitar documentos atualizados do fornecedor."
    })
  },
  {
    role: "user",
    content: "O marketing precisa aprovar a peça, depois enviar pra impressão."
  },
  {
    role: "assistant",
    content: JSON.stringify({
      area: "Vendas",
      tipo: "aprovação",
      prioridade: "média",
      descricao_estruturada: "Aprovação de peça de marketing para impressão.",
      sugestao_proximo_passo: "Revisar arte final e encaminhar validação."
    })
  },
  {
    role: "user",
    content: "Cliente pediu upgrade do plano, precisa validar contrato e ajustar billing."
  },
  {
    role: "assistant",
    content: JSON.stringify({
      area: "Vendas",
      tipo: "solicitação",
      prioridade: "média",
      descricao_estruturada: "Solicitação de upgrade de plano com ajuste de faturamento.",
      sugestao_proximo_passo: "Verificar condições do novo plano e atualizar contrato."
    })
  }
];

export async function parseDemand(text: string): Promise<any> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.warn("Missing OPENAI_API_KEY");
    return {
      area: "TI",
      tipo: "incidente",
      prioridade: "média",
      descricao_estruturada: "Demanda simulada (API Key ausente): " + text,
      sugestao_proximo_passo: "Configurar chave da API OpenAI."
    };
  }

  const openai = new OpenAI({ apiKey });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...FEW_SHOT_EXAMPLES as any,
        { role: "user", content: text }
      ],
      temperature: 0.1,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("No content returned");

    try {
      return JSON.parse(content);
    } catch (e) {
      const cleanContent = content.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleanContent);
    }
  } catch (error) {
    console.error("Error parsing demand:", error);
    throw error;
  }
}
