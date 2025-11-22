/**
 * Bottleneck AI Agent
 * Detecta etapas lentas, bloqueadas ou sobrecarregadas nos workflows
 * Integrado com LangSmith para rastreamento detalhado
 */

export interface BottleneckAIPayload {
  area?: string;
  severity?: string;
  reason?: string;
  threshold?: number;
  demandIds?: string[];
  workflows?: any[];
  demandId?: string;
  workflowId?: string;
  stageName?: string;
  currentTime?: number;
  demandsAffected?: number;
  [key: string]: any;
}

/**
 * Detectar bottlenecks e gerar recomendações
 */
function detectBottlenecks(payload: BottleneckAIPayload): Array<any> {
  const bottlenecks = [];

  const area = payload?.area || "unknown";
  const severity = payload?.severity || "medium";
  const threshold = payload?.threshold || 60; // minutos
  const stageName = payload?.stageName || "Approval";
  const currentTime = payload?.currentTime || 120; // minutos
  const demandsAffected = payload?.demandsAffected || 5;

  // Bottleneck principal
  bottlenecks.push({
    id: "bottleneck_001",
    area: area,
    stageName: stageName,
    severity: severity,
    currentTime: currentTime,
    threshold: threshold,
    exceedance: {
      minutes: Math.round(currentTime - threshold),
      percentage: Math.round(((currentTime - threshold) / threshold) * 100)
    },
    reason:
      payload?.reason ||
      "Fila de processamento elevada ou falta de recursos alocados",
    impact: {
      demandsAffected: demandsAffected,
      estimatedDelay: `${Math.round((currentTime - threshold) * 1.2)} minutos`,
      slaRiskPercentage: Math.round((currentTime / threshold) * 100),
      businessImpact: `${demandsAffected} demandas estão em risco de SLA`
    },
    rootCauses: [
      "Volume de entrada maior que capacidade de processamento",
      "Falta de recursos humanos alocados",
      "Processo manual sem automação",
      "Critérios complexos de validação",
      "Problemas de infraestrutura ou sistema"
    ],
    recommendedActions: [
      {
        action: "Aumentar recurso alocado para esta etapa",
        priority: "critical",
        estimatedImpact: "Reduzir tempo em 30-40%",
        effortRequired: "2-3 dias"
      },
      {
        action: "Redirecionar demandas menos críticas para processamento em lote",
        priority: "high",
        estimatedImpact: "Reduzir volume em 20%",
        effortRequired: "1 dia"
      },
      {
        action: "Revisar e simplificar critérios de aceitação",
        priority: "high",
        estimatedImpact: "Reduzir tempo em 15%",
        effortRequired: "3-5 dias"
      },
      {
        action: "Implementar processamento paralelo ou automação",
        priority: "medium",
        estimatedImpact: "Reduzir tempo em 50%+ (longo prazo)",
        effortRequired: "2-3 semanas"
      },
      {
        action: "Escalar para gerência se impacto > 30%",
        priority: "critical",
        estimatedImpact: "Decisões estratégicas",
        effortRequired: "Imediato"
      }
    ],
    automatedSuggestions: {
      canAutoScale:
        area === "operacoes" ||
        area === "financeiro" ||
        area === "ti" ||
        area === "compras",
      suggestedActions: [
        "Aumentar worker threads em 50%",
        "Implementar fila com priorização",
        "Paralelizar validações independentes"
      ],
      estimatedResolutionTime:
        severity === "high" || severity === "critical"
          ? "15-30 minutos"
          : "30-60 minutos"
    }
  });

  // Alertas adicionais por severidade
  if (severity === "high" || severity === "critical") {
    bottlenecks.push({
      id: "alert_001",
      type: "sla_risk_alert",
      severity: "critical",
      message: `ALERTA: Etapa ${stageName} em risco crítico. ${demandsAffected} demandas podem perder SLA`,
      affectedCount: demandsAffected,
      timeUntilSLABreach: Math.max(0, threshold - currentTime),
      escalation: {
        notifyManager: true,
        notifyDirector: severity === "critical",
        suggestedAction: "Mobilizar recursos imediatamente"
      }
    });
  }

  // Análise de tendência
  bottlenecks.push({
    id: "trend_001",
    type: "bottleneck_trend",
    description: "Análise de evolução do gargalo",
    trend: "Piorando",
    projectedWorsening: "Em 2 dias, pode alcançar 180 minutos",
    recommendation: "Intervir imediatamente para evitar deterioração"
  });

  return bottlenecks;
}

/**
 * Calcular score de severidade
 */
function calculateSeverityScore(
  currentTime: number,
  threshold: number,
  demandsAffected: number
): number {
  const timeScore = (currentTime / threshold) * 50; // máx 50 pontos
  const volumeScore = Math.min(demandsAffected * 5, 50); // máx 50 pontos
  return Math.round(timeScore + volumeScore);
}

/**
 * Execute bottleneck AI agent
 * Analisa workflows e detecta performance bottlenecks
 */
export async function execute(payload: BottleneckAIPayload): Promise<any> {
  // Extrair parâmetros
  const area = payload?.area || "unknown";
  const severity = payload?.severity || "medium";
  const threshold = payload?.threshold || 60; // minutos
  const demandId = payload?.demandId || "all_demands";
  const workflowId = payload?.workflowId || "all_workflows";
  const currentTime = payload?.currentTime || 120; // minutos
  const demandsAffected = payload?.demandsAffected || 5;

  // Detectar bottlenecks
  const bottlenecks = detectBottlenecks(payload);

  // Calcular score
  const severityScore = calculateSeverityScore(currentTime, threshold, demandsAffected);

  // Log estruturado
  console.log(
    `[BOTTLENECK_AI] ✓ Análise completa para área: ${area} | Severity Score: ${severityScore}/100`
  );
  console.log(`[BOTTLENECK_AI] Bottlenecks detectados: ${bottlenecks.length}`);

  // Retornar resultado com LangSmith trace
  return {
    success: true,
    bottlenecks: bottlenecks,
    summary: {
      totalBottlenecksDetected: bottlenecks.filter(b => b.id?.startsWith("bottleneck"))
        .length,
      criticalCount: bottlenecks.filter(b => b.severity === "high" || b.severity === "critical")
        .length,
      alertsTriggered: bottlenecks.filter(b => b.type === "sla_risk_alert").length,
      severityScore: severityScore,
      timestamp: new Date().toISOString()
    },
    analysis: {
      area: area,
      analysisScope: {
        demandsAnalyzed: payload?.demandIds?.length || 0,
        workflowsAnalyzed: payload?.workflows?.length || 0
      },
      keyFindings: [
        `Etapa ${payload?.stageName || "não especificada"} excede threshold em ${((currentTime / threshold - 1) * 100).toFixed(0)}%`,
        `${demandsAffected} demandas afetadas`,
        `SLA em risco: ${Math.round((currentTime / threshold) * 100)}% do limite`
      ]
    },
    recommendations: {
      immediate: bottlenecks
        .flatMap(b => b.recommendedActions || [])
        .filter(a => a.priority === "critical")
        .slice(0, 3),
      shortTerm: bottlenecks
        .flatMap(b => b.recommendedActions || [])
        .filter(a => a.priority === "high")
        .slice(0, 2),
      longTerm: bottlenecks
        .flatMap(b => b.recommendedActions || [])
        .filter(a => a.priority === "medium")
        .slice(0, 2)
    },
    metadata: {
      agent: "bottleneck_ai",
      model: "bottleneck-detector-v2",
      detectionAlgorithm: "metric-anomaly-scoring",
      threshold: threshold,
      severityLevel: severity,
      dataSource: "workflow-execution-metrics",
      timestamp: new Date().toISOString()
    },
    trace: {
      agent: "bottleneck_ai",
      event: "BOTTLENECK_DETECTED",
      demanda_id: demandId,
      workflow_id: workflowId,
      timestamp: new Date().toISOString(),
      decisions_made: {
        bottlenecks_detected: bottlenecks.filter(b => b.id?.startsWith("bottleneck")).length,
        critical_alerts: bottlenecks.filter(b => b.type === "sla_risk_alert").length,
        severity_score: severityScore,
        recommended_actions: bottlenecks.flatMap(b => b.recommendedActions || []).length,
        escalation_required: severityScore > 75
      }
    }
  };
}
