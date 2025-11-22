/**
 * Workflow Builder Agent
 * Transforma uma demanda em um workflow completo e personalizado
 * Integrado com LangSmith para rastreamento detalhado
 */

import { createWorkflowForDemand } from "./workflowAgentService";
import { buildAgentPrompt } from "./system_prompts";

export interface WorkflowBuilderPayload {
  demand?: any;
  demandId?: string;
  parsed?: any;
  rawText?: string;
  area?: string;
  descricao?: string;
  prioridade?: string;
}

/**
 * Áreas de negócio suportadas
 */
const SUPPORTED_AREAS = [
  "rh",
  "ti",
  "financeiro",
  "compras",
  "juridico",
  "facilities",
  "operacoes",
  "marketing",
  "comercial"
];

/**
 * Inferir área automaticamente do texto da demanda
 */
function inferArea(text: string): string {
  const lowerText = text.toLowerCase();

  const areaKeywords: Record<string, string[]> = {
    rh: ["contrata", "estágio", "recrutamento", "folha", "benefício", "férias"],
    ti: ["desenvolvimento", "sistema", "infra", "código", "deploy", "servidor"],
    financeiro: ["pagamento", "fatura", "orçamento", "despesa", "nota fiscal"],
    compras: ["fornecedor", "cotação", "pedido", "compra", "processo seletivo"],
    juridico: ["contrato", "parecer", "compliance", "análise legal", "cláusula"],
    facilities: ["manutenção", "limpeza", "espaço", "escritório", "mobiliário"],
    operacoes: ["processo", "eficiência", "fluxo", "produção", "qualidade"],
    marketing: ["campanha", "conteúdo", "marca", "publicidade", "social"],
    comercial: ["cliente", "proposta", "vendas", "negociação", "parceria"]
  };

  for (const [area, keywords] of Object.entries(areaKeywords)) {
    if (keywords.some(kw => lowerText.includes(kw))) {
      return area;
    }
  }

  return "operacoes";
}

/**
 * Gerar etapas baseadas na área
 */
function generateStages(
  area: string,
  demandText: string
): Array<{ nome: string; descricao: string; responsavel: string; sla_horas: number }> {
  const areaLower = area.toLowerCase();

  const stageTemplates: Record<
    string,
    Array<{ nome: string; descricao: string; responsavel: string; sla_horas: number }>
  > = {
    rh: [
      {
        nome: "Abertura da Vaga",
        descricao: "Definir perfil, descrição e requisitos da posição",
        responsavel: "Gerente de RH",
        sla_horas: 24
      },
      {
        nome: "Triagem de Candidatos",
        descricao: "Revisar currículos e selecionar candidatos pré-qualificados",
        responsavel: "Especialista em Recrutamento",
        sla_horas: 48
      },
      {
        nome: "Entrevistas",
        descricao: "Conduzir entrevistas técnicas e comportamentais",
        responsavel: "Gerente + Time",
        sla_horas: 72
      },
      {
        nome: "Aprovação",
        descricao: "Avaliação final e aprovação da diretoria",
        responsavel: "Diretor",
        sla_horas: 24
      },
      {
        nome: "Onboarding",
        descricao: "Preparação de documentos e integração do novo colaborador",
        responsavel: "RH + Gestor",
        sla_horas: 48
      }
    ],
    ti: [
      {
        nome: "Análise de Requisitos",
        descricao: "Entender e documentar os requisitos técnicos",
        responsavel: "Tech Lead",
        sla_horas: 24
      },
      {
        nome: "Design de Solução",
        descricao: "Arquitetura e design técnico da solução",
        responsavel: "Arquiteto de Sistemas",
        sla_horas: 48
      },
      {
        nome: "Desenvolvimento",
        descricao: "Implementação da solução",
        responsavel: "Desenvolvedor",
        sla_horas: 120
      },
      {
        nome: "Testes",
        descricao: "Testes unitários, integração e UAT",
        responsavel: "QA Engineer",
        sla_horas: 72
      },
      {
        nome: "Deploy",
        descricao: "Implantação em produção e monitoramento",
        responsavel: "DevOps",
        sla_horas: 24
      }
    ],
    financeiro: [
      {
        nome: "Recebimento",
        descricao: "Recepção e validação inicial do documento",
        responsavel: "Auxiliar Administrativo",
        sla_horas: 4
      },
      {
        nome: "Análise",
        descricao: "Análise contábil e verificação de conformidade",
        responsavel: "Contador",
        sla_horas: 24
      },
      {
        nome: "Aprovação",
        descricao: "Aprovação por gerente ou diretor",
        responsavel: "Gerente Financeiro",
        sla_horas: 24
      },
      {
        nome: "Processamento",
        descricao: "Lançamento contábil e geração de documentos",
        responsavel: "Analista Financeiro",
        sla_horas: 12
      },
      {
        nome: "Pagamento",
        descricao: "Agendamento e realização do pagamento",
        responsavel: "Tesoureiro",
        sla_horas: 24
      }
    ],
    compras: [
      {
        nome: "Requisição",
        descricao: "Criar requisição de compra com especificações",
        responsavel: "Solicitante",
        sla_horas: 8
      },
      {
        nome: "Cotação",
        descricao: "Solicitar propostas de fornecedores qualificados",
        responsavel: "Comprador",
        sla_horas: 48
      },
      {
        nome: "Análise",
        descricao: "Avaliar propostas por preço, prazo e qualidade",
        responsavel: "Gerente de Compras",
        sla_horas: 24
      },
      {
        nome: "Aprovação",
        descricao: "Aprovação da diretoria ou CFO",
        responsavel: "Diretor/CFO",
        sla_horas: 24
      },
      {
        nome: "Pedido",
        descricao: "Emissão de pedido e acompanhamento",
        responsavel: "Comprador",
        sla_horas: 12
      }
    ],
    juridico: [
      {
        nome: "Recebimento",
        descricao: "Recepção e categorização do documento legal",
        responsavel: "Assessor Jurídico",
        sla_horas: 8
      },
      {
        nome: "Análise Preliminar",
        descricao: "Análise inicial de riscos e questões",
        responsavel: "Advogado Sênior",
        sla_horas: 48
      },
      {
        nome: "Análise Profunda",
        descricao: "Análise detalhada com recomendações",
        responsavel: "Especialista",
        sla_horas: 72
      },
      {
        nome: "Parecer Jurídico",
        descricao: "Elaboração de parecer formal",
        responsavel: "Advogado Sênior",
        sla_horas: 48
      },
      {
        nome: "Aprovação",
        descricao: "Aprovação final da diretoria",
        responsavel: "Diretor Jurídico",
        sla_horas: 24
      }
    ],
    facilities: [
      {
        nome: "Solicitação",
        descricao: "Recebimento e registro da solicitação",
        responsavel: "Gerente de Facilities",
        sla_horas: 4
      },
      {
        nome: "Avaliação",
        descricao: "Inspeção e orçamento do trabalho",
        responsavel: "Técnico",
        sla_horas: 24
      },
      {
        nome: "Aprovação",
        descricao: "Aprovação orçamentária",
        responsavel: "Gerente",
        sla_horas: 12
      },
      {
        nome: "Execução",
        descricao: "Realização do trabalho solicitado",
        responsavel: "Time de Operações",
        sla_horas: 72
      },
      {
        nome: "Validação",
        descricao: "Verificação e fechamento do chamado",
        responsavel: "Supervisor",
        sla_horas: 8
      }
    ],
    operacoes: [
      {
        nome: "Recebimento",
        descricao: "Registro e categorização da demanda",
        responsavel: "Operador",
        sla_horas: 2
      },
      {
        nome: "Triagem",
        descricao: "Avaliação de prioridade e roteamento",
        responsavel: "Supervisor",
        sla_horas: 4
      },
      {
        nome: "Processamento",
        descricao: "Execução da operação solicitada",
        responsavel: "Executor",
        sla_horas: 24
      },
      {
        nome: "Qualidade",
        descricao: "Verificação de conformidade",
        responsavel: "Analista QA",
        sla_horas: 4
      },
      {
        nome: "Entrega",
        descricao: "Entrega ao cliente final",
        responsavel: "Gerente",
        sla_horas: 4
      }
    ],
    marketing: [
      {
        nome: "Briefing",
        descricao: "Recebimento e alinhamento de objetivos",
        responsavel: "Gerente de Projetos",
        sla_horas: 8
      },
      {
        nome: "Criação",
        descricao: "Desenvolvimento de conteúdo e materiais",
        responsavel: "Designer/Copywriter",
        sla_horas: 48
      },
      {
        nome: "Revisão",
        descricao: "Review e feedback de stakeholders",
        responsavel: "Gerente Marketing",
        sla_horas: 24
      },
      {
        nome: "Aprovação",
        descricao: "Aprovação final",
        responsavel: "Diretor Marketing",
        sla_horas: 12
      },
      {
        nome: "Publicação",
        descricao: "Publicação e ativação de campanha",
        responsavel: "Especialista Digital",
        sla_horas: 4
      }
    ],
    comercial: [
      {
        nome: "Qualificação",
        descricao: "Qualificar oportunidade e prospect",
        responsavel: "Vendedor",
        sla_horas: 24
      },
      {
        nome: "Proposta",
        descricao: "Desenvolvimento de proposta comercial",
        responsavel: "Gerente de Vendas",
        sla_horas: 48
      },
      {
        nome: "Negociação",
        descricao: "Discussão de termos e condições",
        responsavel: "Vendedor + Cliente",
        sla_horas: 72
      },
      {
        nome: "Aprovação Jurídica",
        descricao: "Revisão contratual",
        responsavel: "Jurídico",
        sla_horas: 48
      },
      {
        nome: "Fechamento",
        descricao: "Assinatura e início de execução",
        responsavel: "Gerente Comercial",
        sla_horas: 24
      }
    ]
  };

  return stageTemplates[areaLower] || stageTemplates.operacoes;
}

/**
 * Gerar regras de movimento entre etapas
 */
function generateMovementRules(
  area: string,
  stages: Array<{ nome: string; descricao: string; responsavel: string; sla_horas: number }>
): Array<{ de: string; para: string; condicao: string }> {
  const rules: Array<{ de: string; para: string; condicao: string }> = [];

  for (let i = 0; i < stages.length - 1; i++) {
    rules.push({
      de: stages[i].nome,
      para: stages[i + 1].nome,
      condicao: "Condição de saída cumprida e validação passou"
    });
  }

  // Regra de rejeição/retorno
  if (stages.length > 1) {
    rules.push({
      de: stages[1].nome,
      para: stages[0].nome,
      condicao: "Rejeição ou necessidade de ajustes"
    });
  }

  return rules;
}

/**
 * Determinar criticidade baseada em contexto
 */
function determineCriticality(area: string, demandText: string): string {
  const lowerText = demandText.toLowerCase();

  if (
    lowerText.includes("urgente") ||
    lowerText.includes("crítico") ||
    lowerText.includes("imediato")
  ) {
    return "crítica";
  }

  if (area === "financeiro" || area === "juridico") {
    return "alta";
  }

  return "normal";
}

/**
 * Execute workflow builder agent
 * Transforma demanda em workflow completo e personalizado
 */
export async function execute(payload: WorkflowBuilderPayload): Promise<any> {
  const demandId = payload?.demandId || `demand_${Date.now()}`;
  const demandText = payload?.rawText || payload?.descricao || "Demanda sem descrição";

  // Inferir área
  const inferredArea = payload?.area || inferArea(demandText);
  const area = SUPPORTED_AREAS.includes(inferredArea.toLowerCase())
    ? inferredArea.toLowerCase()
    : "operacoes";

  // Gerar etapas
  const stages = generateStages(area, demandText);

  // Gerar regras de movimento
  const movementRules = generateMovementRules(area, stages);

  // Determinar criticidade
  const criticality = determineCriticality(area, demandText);

  // Estrutura do workflow
  const workflow = {
    nome_processo: `${area.charAt(0).toUpperCase() + area.slice(1)} - Processo Automatizado`,
    descricao: demandText.substring(0, 200) || "Processo gerado automaticamente pelo Workflow Builder",
    etapas: stages,
    regras_movimento: movementRules,
    metadados: {
      area: area,
      criticidade: criticality,
      tipo_processo: "workflow_automation",
      data_criacao: new Date().toISOString(),
      versao: "1.0"
    },
    trace: {
      agent: "workflow_builder",
      event: "WORKFLOW_GENERATED",
      demanda_id: demandId,
      timestamp: new Date().toISOString(),
      decisions_made: {
        area_inferida: area,
        etapas_geradas: stages.length,
        criticidade_determinada: criticality,
        regras_movimento: movementRules.length
      }
    }
  };

  // Log estruturado
  console.log(
    `[WORKFLOW_BUILDER] ✓ Workflow gerado para demanda ${demandId} na área ${area}`
  );
  console.log(
    `[WORKFLOW_BUILDER] Etapas: ${stages.length} | SLA Total: ${stages.reduce((sum, s) => sum + s.sla_horas, 0)}h`
  );

  // Retornar resultado com LangSmith trace
  return {
    success: true,
    workflow: workflow,
    metadata: {
      demandId: demandId,
      area: area,
      stageCount: stages.length,
      totalSLAHours: stages.reduce((sum, s) => sum + s.sla_horas, 0),
      model: "workflow-builder-v2",
      processingTime: new Date().toISOString()
    }
  };
}
