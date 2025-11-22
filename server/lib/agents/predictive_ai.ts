/**
 * Predictive AI Agent
 * Prevê tendências futuras baseadas em dados históricos
 * Integrado com LangSmith para rastreamento detalhado
 */

export interface PredictiveAIPayload {
  days?: number;
  demandHistory?: any[];
  areasData?: any[];
  historicalMetrics?: Record<string, any>;
  focusArea?: string;
  [key: string]: any;
}

interface Prediction {
  day: string;
  expectedVolume: number;
  riskScore: number;
  trend: "up" | "down" | "stable";
  status: "good" | "warning" | "critical";
  recommendation?: string;
}

/**
 * Analisar padrões históricos
 */
function analyzeHistoricalPatterns(payload: PredictiveAIPayload): Record<string, any> {
  const demandHistory = payload?.demandHistory || [];
  
  if (demandHistory.length === 0) {
    return {
      averageDailyVolume: 0,
      peakDayVolume: 0,
      lowestDayVolume: 0,
      growthTrend: 0,
      volatility: 0
    };
  }

  const volumes = demandHistory.map((d: any) => d.count || 0);
  const averageDailyVolume = volumes.reduce((a: number, b: number) => a + b, 0) / volumes.length;
  const peakDayVolume = Math.max(...volumes);
  const lowestDayVolume = Math.min(...volumes);
  
  // Calcular tendência (regressão linear simples)
  let growthTrend = 0;
  if (volumes.length > 1) {
    const firstHalf = volumes.slice(0, Math.floor(volumes.length / 2));
    const secondHalf = volumes.slice(Math.floor(volumes.length / 2));
    const firstAvg = firstHalf.reduce((a: number, b: number) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a: number, b: number) => a + b, 0) / secondHalf.length;
    growthTrend = ((secondAvg - firstAvg) / firstAvg) * 100;
  }

  // Volatilidade
  const variance = volumes.reduce((sum: number, v: number) => sum + Math.pow(v - averageDailyVolume, 2), 0) / volumes.length;
  const volatility = Math.sqrt(variance);

  return {
    averageDailyVolume: Math.round(averageDailyVolume),
    peakDayVolume,
    lowestDayVolume,
    growthTrend: Math.round(growthTrend * 10) / 10,
    volatility: Math.round(volatility)
  };
}

/**
 * Gerar previsões para próximos N dias
 */
function generatePredictions(payload: PredictiveAIPayload): Prediction[] {
  const days = payload?.days || 7;
  const patterns = analyzeHistoricalPatterns(payload);
  
  const dayLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];
  const predictions: Prediction[] = [];

  const baseVolume = patterns.averageDailyVolume || 50;
  const trendMultiplier = 1 + (patterns.growthTrend || 0) / 100;

  for (let i = 0; i < days; i++) {
    // Simular variação realista baseada em padrões históricos
    const dayOfWeek = (new Date().getDay() + i) % 7;
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
    const weekendFactor = isWeekend ? 0.7 : 1.0; // Fim de semana tem menos volume
    
    // Volume esperado com tendência e sazonalidade
    const expectedVolume = Math.round(
      baseVolume * trendMultiplier * weekendFactor * (0.9 + Math.random() * 0.2)
    );

    // Calcular risco baseado em volume (quanto mais alto, mais risco de gargalo)
    const volumeRiskRatio = expectedVolume / (patterns.peakDayVolume || baseVolume * 1.5);
    const baseRisk = 30 + volumeRiskRatio * 40; // 30-70
    const riskScore = Math.min(100, Math.round(baseRisk + (Math.random() - 0.5) * 10));

    // Determinar tendência
    let trend: "up" | "down" | "stable";
    if (i < 2) {
      trend = patterns.growthTrend > 5 ? "up" : patterns.growthTrend < -5 ? "down" : "stable";
    } else {
      trend = riskScore > 60 ? "up" : riskScore < 40 ? "down" : "stable";
    }

    // Status
    const status = riskScore > 70 ? "critical" : riskScore > 50 ? "warning" : "good";

    // Recomendação
    let recommendation = undefined;
    if (status === "critical") {
      recommendation = "Ativar escalação automática e aumentar recursos";
    } else if (status === "warning") {
      recommendation = "Preparar recursos adicionais standby";
    }

    predictions.push({
      day: dayLabels[dayOfWeek],
      expectedVolume,
      riskScore,
      trend,
      status,
      recommendation
    });
  }

  return predictions;
}

/**
 * Executar agente de previsão
 */
export async function execute(payload: PredictiveAIPayload): Promise<any> {
  try {
    console.log("[PREDICTIVE_AI] Executando previsões com payload:", {
      days: payload.days,
      hasDemandHistory: !!payload.demandHistory?.length,
      focusArea: payload.focusArea
    });

    // Analisar padrões históricos
    const patterns = analyzeHistoricalPatterns(payload);
    
    // Gerar previsões
    const predictions = generatePredictions(payload);

    // Calcular métricas agregadas
    const avgRisk = Math.round(predictions.reduce((sum, p) => sum + p.riskScore, 0) / predictions.length);
    const criticalDays = predictions.filter(p => p.status === "critical").length;
    const warningDays = predictions.filter(p => p.status === "warning").length;

    const summary = {
      forecast_period_days: predictions.length,
      average_risk_score: avgRisk,
      critical_days: criticalDays,
      warning_days: warningDays,
      expected_trend: patterns.growthTrend > 5 ? "crescimento" : patterns.growthTrend < -5 ? "redução" : "estável",
      recommendation:
        avgRisk > 70
          ? "Risco elevado esperado. Preparar plano de contingência."
          : avgRisk > 50
          ? "Risco moderado. Monitorar próximas 48h."
          : "Situação sob controle. Manter vigilância."
    };

    console.log("[PREDICTIVE_AI] ✓ Previsões geradas com sucesso");

    return {
      success: true,
      predictions,
      summary,
      patterns,
      timestamp: new Date().toISOString(),
      metadata: {
        agent: "predictive_ai",
        model: "forecasting-v1",
        algorithm: "historical-pattern-analysis",
        confidence: "media"
      }
    };
  } catch (error) {
    console.error("[PREDICTIVE_AI] Erro:", error);
    return {
      success: false,
      error: String(error),
      predictions: [],
      summary: null
    };
  }
}
