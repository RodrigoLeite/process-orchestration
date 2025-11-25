export const graphTranslations = {
  'pt-BR': {
    inputValidation: 'Validação de Entrada',
    workflowGenerator: 'Gerador de Workflow',
    bottleneckMonitor: 'Monitor de Gargalos',
    smartInsights: 'Insights Inteligentes',
    outputConsolidation: 'Consolidação de Saída',
    inputValidationDesc: 'Valida e prepara a demanda para processamento. Verifica se todos os campos necessários estão presentes e se o formato está correto.',
    inputValidationDetailedDesc: 'Valida e prepara a demanda para processamento, verificando se todos os campos necessários estão presentes e se o formato está correto. Este nodo é crítico pois previne que demandas inválidas avancem no pipeline.',
    workflowGeneratorDesc: 'Gera um workflow estruturado baseado na demanda. Cria etapas, responsabilidades, dependências e critérios de sucesso.',
    workflowGeneratorDetailedDesc: 'Agente especializado que gera workflows estruturados a partir de demandas. Utiliza GPT-4 para criar etapas bem definidas, atribuir responsabilidades, estimar durações e definir critérios de sucesso. Cada workflow inclui dependências entre etapas e prioridades.',
    bottleneckMonitorDesc: 'Analisa o workflow gerado para identificar possíveis gargalos, riscos e pontos de contenção. Calcula scores de severidade.',
    bottleneckMonitorDetailedDesc: 'Analisa workflows para identificar gargalos potenciais usando análise de movimentação histórica, dependências críticas e pontos de contenção. Calcula scores de severidade (crítica, alta, média, baixa) para cada gargalo identificado.',
    smartInsightsDesc: 'Extrai insights acionáveis do workflow e gargalos. Fornece recomendações de otimização e identificação de oportunidades.',
    smartInsightsDetailedDesc: 'Extrai insights acionáveis e recomendações a partir da análise de workflows e gargalos. Identifica padrões, oportunidades de otimização e fatores de risco para melhor tomada de decisão.',
    outputConsolidationDesc: 'Consolida todos os resultados (workflow, gargalos, insights) e os persiste no banco de dados para auditoria e análise.',
    outputConsolidationDetailedDesc: 'Consolida todos os resultados do pipeline de orquestração (workflow, gargalos, insights) e os persiste no banco de dados para auditoria, análise e histórico de execução.',
    edgeValidated: 'validado',
    edgeWorkflowCreated: 'workflow criado',
    edgeBottlenecksDetected: 'gargalos detectados',
    edgeInsightsGenerated: 'insights gerados',
  },
  'en-US': {
    inputValidation: 'Input Validation',
    workflowGenerator: 'Workflow Generator',
    bottleneckMonitor: 'Bottleneck Monitor',
    smartInsights: 'Smart Insights',
    outputConsolidation: 'Output Consolidation',
    inputValidationDesc: 'Validates and prepares the demand for processing. Checks if all necessary fields are present and the format is correct.',
    inputValidationDetailedDesc: 'Validates and prepares the demand for processing, verifying if all necessary fields are present and the format is correct. This node is critical as it prevents invalid demands from advancing in the pipeline.',
    workflowGeneratorDesc: 'Generates a structured workflow based on the demand. Creates stages, responsibilities, dependencies, and success criteria.',
    workflowGeneratorDetailedDesc: 'Specialized agent that generates structured workflows from demands. Uses GPT-4 to create well-defined stages, assign responsibilities, estimate durations, and define success criteria. Each workflow includes dependencies between stages and priorities.',
    bottleneckMonitorDesc: 'Analyzes the generated workflow to identify potential bottlenecks, risks, and points of contention. Calculates severity scores.',
    bottleneckMonitorDetailedDesc: 'Analyzes workflows to identify potential bottlenecks using historical movement analysis, critical dependencies, and points of contention. Calculates severity scores (critical, high, medium, low) for each identified bottleneck.',
    smartInsightsDesc: 'Extracts actionable insights from the workflow and bottlenecks. Provides optimization recommendations and identifies opportunities.',
    smartInsightsDetailedDesc: 'Extracts actionable insights and recommendations from the analysis of workflows and bottlenecks. Identifies patterns, optimization opportunities, and risk factors for better decision-making.',
    outputConsolidationDesc: 'Consolidates all results (workflow, bottlenecks, insights) and persists them in the database for audit and analysis.',
    outputConsolidationDetailedDesc: 'Consolidates all results from the orchestration pipeline (workflow, bottlenecks, insights) and persists them in the database for audit, analysis, and execution history.',
    edgeValidated: 'validated',
    edgeWorkflowCreated: 'workflow created',
    edgeBottlenecksDetected: 'bottlenecks detected',
    edgeInsightsGenerated: 'insights generated',
  }
};

export function getGraphLabels(language: string = 'pt-BR') {
  return graphTranslations[language as keyof typeof graphTranslations] || graphTranslations['pt-BR'];
}
