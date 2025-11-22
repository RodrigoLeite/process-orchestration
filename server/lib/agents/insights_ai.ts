/**
 * Insights IA Agent
 * Analisa workflows existentes e gera inteligência acionável
 * Integrado com LangSmith para rastreamento detalhado
 */

export interface InsightsIAPayload {
  workflowId?: string;
  demandId?: string;
  workflow?: any;
  stages?: any[];
  currentStage?: string;
  elapsedTime?: number;
  slaHours?: number;
  demandsInProgress?: number;
  recentMovements?: any[];
  processingTime?: number;
  event?: string;
  [key: string]: any;
}

/**
 * Tipo de insight
 */
interface Insight {
  tipo: string;
  mensagem: string;
  impacto: "alto" | "médio" | "baixo";
  recomendacao: string;
  evidencia?: string;
  prioridade?: "crítica" | "alta" | "média" | "baixa";
}

/**
 * Analisar workflow e gerar insights de atraso
 */
function analyzeDelayRisks(payload: InsightsIAPayload): Insight[] {
  const insights: Insight[] = [];
  const elapsedTime = payload?.elapsedTime || 0;
  const slaHours = payload?.slaHours || 48;
  const slaMinutes = slaHours * 60;
  const utilizationPercent = (elapsedTime / slaMinutes) * 100;

  // Insight 1: Risco de atraso baseado em tempo decorrido
  if (utilizationPercent > 75) {
    insights.push({
      tipo: "🌡 Sinal de Atraso",
      mensagem: `Workflow utilizou ${utilizationPercent.toFixed(0)}% do SLA (${elapsedTime}min de ${slaMinutes}min)`,
      impacto: utilizationPercent > 90 ? "alto" : "médio",
      recomendacao:
        utilizationPercent > 90
          ? "URGENTE: Mobilizar recursos para acelerar etapas restantes"
          : "Revisar etapa atual e identificar gargalos potenciais",
      evidencia: `${elapsedTime} minutos decorridos`,
      prioridade: utilizationPercent > 90 ? "crítica" : "alta"
    });
  }

  // Insight 2: Acúmulo de cards (demandas em progresso)
  if ((payload?.demandsInProgress || 0) > 5) {
    insights.push({
      tipo: "🌡 Acúmulo de Cards",
      mensagem: `${payload.demandsInProgress} demandas em progresso simultânea. Risco de travamento.`,
      impacto: "alto",
      recomendacao:
        "Priorizar e completar demandas em etapas críticas antes de aceitar novas",
      evidencia: `${payload.demandsInProgress} cards ativas`,
      prioridade: "alta"
    });
  }

  return insights;
}

/**
 * Analisar workflow e gerar insights de melhoria
 */
function analyzeImprovements(payload: InsightsIAPayload): Insight[] {
  const insights: Insight[] = [];
  const stages = payload?.stages || [];
  const workflow = payload?.workflow || {};

  // Insight 3: Simplificação do fluxo
  if (stages.length > 7) {
    insights.push({
      tipo: "🔁 Simplificação do Fluxo",
      mensagem: `Workflow possui ${stages.length} etapas. Acima do recomendado (máx 7).`,
      impacto: "médio",
      recomendacao: `Mesclar etapas similares. Combinar "Validação" + "Verificação" em uma única etapa.`,
      evidencia: `${stages.length} etapas identificadas`,
      prioridade: "média"
    });
  }

  // Insight 4: Sugestões de rebalanceamento
  if ((payload?.workflow?.responsaveis || []).length < 3 && stages.length > 4) {
    insights.push({
      tipo: "👥 Rebalanceamento de Responsáveis",
      mensagem: `Poucas pessoas responsáveis (${payload.workflow.responsaveis?.length || 0}) para ${stages.length} etapas`,
      impacto: "médio",
      recomendacao:
        "Aumentar número de responsáveis ou distribuir carga mais uniformemente entre áreas",
      prioridade: "média"
    });
  }

  // Insight 5: Sugestões de reordenação
  if (stages.length >= 3) {
    const approvalStages = stages.filter((s: any) =>
      ["aprovação", "aprovação", "review"].includes((s?.nome || "").toLowerCase())
    );

    if (approvalStages.length > 1) {
      insights.push({
        tipo: "🧭 Reordenação de Etapas",
        mensagem: `${approvalStages.length} etapas de aprovação detectadas. Podem estar duplicadas.`,
        impacto: "médio",
        recomendacao: "Consolidar aprovações em uma única etapa ou torna-las sequenciais em vez de paralelas",
        prioridade: "média"
      });
    }
  }

  return insights;
}

/**
 * Analisar workflow e gerar insights de compliance e riscos
 */
function analyzeCompliance(payload: InsightsIAPayload): Insight[] {
  const insights: Insight[] = [];

  // Insight 6: Riscos de compliance
  const riskKeywords = ["juridico", "financeiro", "compliance", "auditoria", "segurança"];
  const workflowText =
    `${payload?.workflow?.nome_processo || ""} ${payload?.workflow?.descricao || ""}`.toLowerCase();

  if (riskKeywords.some(kw => workflowText.includes(kw))) {
    insights.push({
      tipo: "🚧 Risco de Compliance",
      mensagem: `Workflow em área sensível detectada (${riskKeywords.filter(kw => workflowText.includes(kw)).join(", ")})`,
      impacto: "alto",
      recomendacao:
        "Garantir trilha de auditoria completa. Documentar todas as decisões e aprovações.",
      prioridade: "alta"
    });
  }

  return insights;
}

/**
 * Calcular métricas do workflow
 */
function calculateMetrics(payload: InsightsIAPayload): any {
  const stages = payload?.stages || [];
  const elapsedTime = payload?.elapsedTime || 0;
  const slaHours = payload?.slaHours || 48;
  const slaMinutes = slaHours * 60;

  // Eficiência (0-100)
  const efficiency = Math.min(100, Math.round((100 / stages.length) * (stages.length - 1)));

  // Risco de atraso (0-100)
  const delayRisk = Math.round((elapsedTime / slaMinutes) * 100);

  // Etapas críticas (que estão acumulando tempo)
  const stagesCritical = stages
    .filter((s: any) => (s?.sla_horas || 0) > (slaHours / 2))
    .map((s: any) => s?.nome);

  // Tempo estimado para conclusão
  const remainingStages = Math.max(0, stages.length - 1);
  const avgTimePerStage = remainingStages > 0 ? slaMinutes / stages.length : 0;
  const estimatedCompletionHours = (avgTimePerStage * remainingStages) / 60;

  return {
    eficiencia: efficiency,
    risco_atraso: Math.min(100, delayRisk),
    etapas_criticas: stagesCritical,
    tempo_estimado_conclusao_horas: Math.round(estimatedCompletionHours)
  };
}

/**
 * Gerar recomendação geral de otimização
 */
function generateOptimizationInsight(payload: InsightsIAPayload, metrics: any): Insight | null {
  const efficiency = metrics.eficiencia;
  const delayRisk = metrics.risco_atraso;

  if (efficiency < 50 || delayRisk > 75) {
    const improvements: string[] = [];

    if (efficiency < 50) {
      improvements.push("Revisar distribuição de responsabilidades entre etapas");
    }
    if (delayRisk > 75) {
      improvements.push("Paralelizar etapas independentes onde possível");
      improvements.push("Implementar automação em validações repetitivas");
    }

    return {
      tipo: "🎯 Otimização Operacional",
      mensagem: `Workflow pode ser otimizado. Eficiência: ${efficiency}% | Risco de atraso: ${delayRisk}%`,
      impacto: "alto",
      recomendacao: improvements.join(". "),
      prioridade: "alta"
    };
  }

  return null;
}

/**
 * Execute insights IA agent
 * Analisa workflows existentes e gera inteligência acionável
 */
export async function execute(payload: InsightsIAPayload): Promise<any> {
  const workflowId = payload?.workflowId || payload?.workflow?.id || "unknown";
  const demandId = payload?.demandId || "all_demands";
  const event = payload?.event || "WORKFLOW_ANALYSIS";

  // Coletar insights de todas as análises
  const insights: Insight[] = [];

  // 1. Análise de atrasos
  insights.push(...analyzeDelayRisks(payload));

  // 2. Análise de melhorias
  insights.push(...analyzeImprovements(payload));

  // 3. Análise de compliance
  insights.push(...analyzeCompliance(payload));

  // 4. Calcular métricas
  const metrics = calculateMetrics(payload);

  // 5. Gerar insight de otimização se aplicável
  const optimizationInsight = generateOptimizationInsight(payload, metrics);
  if (optimizationInsight) {
    insights.push(optimizationInsight);
  }

  // 6. Predição de conclusão
  insights.push({
    tipo: "📊 Predição de Conclusão",
    mensagem: `Tempo estimado até conclusão: ${metrics.tempo_estimado_conclusao_horas} horas`,
    impacto: "médio",
    recomendacao: "Validar estimativa com responsáveis. Considerar buffer para imprevistos.",
    prioridade: "média"
  });

  // Log estruturado
  console.log(
    `[INSIGHTS_IA] ✓ Análise completa para workflow ${workflowId} | Event: ${event}`
  );
  console.log(
    `[INSIGHTS_IA] Insights gerados: ${insights.length} | Eficiência: ${metrics.eficiencia}% | Risco: ${metrics.risco_atraso}%`
  );

  // Retornar resultado com estrutura obrigatória
  return {
    success: true,
    insights: insights,
    metricas: metrics,
    summary: {
      totalInsights: insights.length,
      highPriorityCount: insights.filter(i => i.prioridade === "crítica" || i.prioridade === "alta")
        .length,
      highImpactCount: insights.filter(i => i.impacto === "alto").length
    },
    trace: {
      agent: "insights_ia",
      event: event,
      workflow_id: workflowId,
      demanda_id: demandId,
      timestamp: new Date().toISOString(),
      decisions_made: {
        insights_generated: insights.length,
        critical_priority_insights: insights.filter(i => i.prioridade === "crítica").length,
        high_impact_insights: insights.filter(i => i.impacto === "alto").length,
        metrics_calculated: Object.keys(metrics).length,
        analysis_quality: calculateAnalysisQuality(insights, metrics)
      }
    },
    metadata: {
      agent: "insights_ia",
      model: "insights-analyzer-v3",
      analysisFramework: "workflow-optimization",
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Auto-avaliação da qualidade da análise
 */
function calculateAnalysisQuality(insights: Insight[], metrics: any): string {
  const insightCount = insights.length;
  const hasHighPriority = insights.some(i => i.prioridade === "crítica");
  const hasConcreteRecommendations = insights.every(i => i.recomendacao && i.recomendacao.length > 10);
  const hasEvidence = insights.filter(i => i.evidencia).length / insightCount > 0.5;

  let quality = "boa";

  if (insightCount < 3) {
    quality = "limitada";
  } else if (hasHighPriority && hasConcreteRecommendations && hasEvidence) {
    quality = "excelente";
  } else if (hasConcreteRecommendations) {
    quality = "muito_boa";
  }

  return quality;
}
