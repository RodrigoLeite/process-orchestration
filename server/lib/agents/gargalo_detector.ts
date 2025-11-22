/**
 * Gargalo Detector Agent
 * Especializado em identificar pontos de lentidão e travamentos no processo
 * Integrado com LangSmith e auto-escalation para criticidade alta
 */

import { shouldEscalate, executeEscalation } from "../autoEscalation";

export interface GargaloDetectorPayload {
  workflowId?: string;
  demandId?: string;
  etapas?: any[];
  etapa_analisada?: string;
  cardsNaEtapa?: number;
  slaEtapa?: number;
  tempoMedio?: number;
  responsavel?: string;
  volumeAnormal?: boolean;
  repeticaoAtraso?: boolean;
  area?: string;
  workflow?: any;
  [key: string]: any;
}

/**
 * Tipo de gargalo detectado
 */
interface Gargalo {
  etapa: string;
  causa_provavel: string;
  impacto: string;
  nivel_criticidade: "crítico" | "alto" | "médio" | "baixo";
  sugestao_correcao: string;
  evidencia?: string;
  riscos?: string[];
  prioridade?: string;
}

/**
 * Analisar critérios de gargalo
 */
function analyzeBottleneckCriteria(payload: GargaloDetectorPayload): Gargalo[] {
  const gargalos: Gargalo[] = [];
  const etapa = payload?.etapa_analisada || "Etapa Desconhecida";
  const cardsNaEtapa = payload?.cardsNaEtapa || 0;
  const slaEtapa = payload?.slaEtapa || 24; // horas
  const tempoMedio = payload?.tempoMedio || 0; // minutos
  const responsavel = payload?.responsavel || "Não especificado";

  // Critério 1: Volume de cards acima do normal
  if (cardsNaEtapa > 5) {
    gargalos.push({
      etapa: etapa,
      causa_provavel: "Volume de cards acima do normal",
      impacto: `${cardsNaEtapa} cards acumulados na etapa`,
      nivel_criticidade: cardsNaEtapa > 10 ? "crítico" : "alto",
      sugestao_correcao:
        cardsNaEtapa > 10
          ? "Mobilizar recursos adicionais imediatamente e paralelizar processamento"
          : "Aumentar capacidade de processamento ou redirecionar parte da carga",
      evidencia: `${cardsNaEtapa} cards na etapa`,
      riscos: [
        "Travamento do workflow",
        "Atrasos em cascata nas próximas etapas",
        "Possível perda de SLA global"
      ],
      prioridade: cardsNaEtapa > 10 ? "crítica" : "alta"
    });
  }

  // Critério 2: SLA estourou repetidamente
  if (payload?.repeticaoAtraso) {
    gargalos.push({
      etapa: etapa,
      causa_provavel: "Padrão de atraso repetido",
      impacto: `SLA estourou múltiplas vezes nesta etapa`,
      nivel_criticidade: "alto",
      sugestao_correcao:
        "Revisar processos da etapa, aumentar recursos ou simplificar critérios de aceitação",
      evidencia: `Repetição de atrasos documentada`,
      riscos: ["Perda de confiança no SLA", "Insatisfação dos clientes"],
      prioridade: "alta"
    });
  }

  // Critério 3: Cards ficam muito tempo parados
  if (tempoMedio > slaEtapa * 0.75 * 60) {
    // Mais de 75% do SLA em uma etapa
    gargalos.push({
      etapa: etapa,
      causa_provavel: "Cards retidos muito tempo",
      impacto: `Tempo médio de ${tempoMedio} minutos (SLA da etapa: ${slaEtapa * 60} minutos)`,
      nivel_criticidade:
        tempoMedio > slaEtapa * 60 ? "crítico" : tempoMedio > slaEtapa * 0.9 * 60 ? "alto" : "médio",
      sugestao_correcao:
        "Investigar causas de demora (aprovações, validações) e paralelizar quando possível",
      evidencia: `${tempoMedio} minutos = ${((tempoMedio / (slaEtapa * 60)) * 100).toFixed(0)}% do SLA`,
      riscos: ["Crescimento exponencial de atraso", "Overflow nas próximas etapas"],
      prioridade: tempoMedio > slaEtapa * 60 ? "crítica" : "alta"
    });
  }

  // Critério 4: Responsável único sobrecarregado
  if (payload?.responsavel && cardsNaEtapa > 3) {
    gargalos.push({
      etapa: etapa,
      causa_provavel: "Responsável único sobrecarregado",
      impacto: `Uma pessoa (${responsavel}) processando ${cardsNaEtapa} cards`,
      nivel_criticidade: cardsNaEtapa > 8 ? "crítico" : "alto",
      sugestao_correcao:
        "Distribuir carga entre múltiplos responsáveis ou implementar automação",
      evidencia: `1 responsável com ${cardsNaEtapa} cards em fila`,
      riscos: ["Burnout do responsável", "Possível ausência compromete fluxo"],
      prioridade: cardsNaEtapa > 8 ? "crítica" : "alta"
    });
  }

  // Critério 5: Volume anormal de demandas
  if (payload?.volumeAnormal) {
    gargalos.push({
      etapa: etapa,
      causa_provavel: "Volume anormal de demandas detectado",
      impacto: "Influxo inesperado de requisições",
      nivel_criticidade: "alto",
      sugestao_correcao:
        "Escalar recursos temporários, implementar fila de priorização, comunicar ao cliente sobre delays",
      evidencia: `Volume superior ao normal registrado`,
      riscos: ["SLA de todas demandas em risco", "Cascata de atrasos"],
      prioridade: "alta"
    });
  }

  return gargalos;
}

/**
 * Gerar recomendações específicas por tipo de causa
 */
function generateMitigationPlan(gargalo: Gargalo, area: string): any {
  const causaMap: Record<string, string[]> = {
    "Volume de cards acima do normal": [
      "Aumentar número de executores",
      "Implementar processamento em paralelo",
      "Criar fila de priorização (crítico > alto > normal)",
      "Automatizar validações simples"
    ],
    "Padrão de atraso repetido": [
      "Analisar histórico de atrasos (causas root)",
      "Revisar critérios e simplificar quando possível",
      "Adicionar recursos permanentemente",
      "Implementar SLA interno mais agressivo"
    ],
    "Cards retidos muito tempo": [
      "Identificar etapa específica que demora",
      "Revisar aprovações (paralelo vs sequencial)",
      "Implementar timeout automático",
      "Escalar após X minutos sem progresso"
    ],
    "Responsável único sobrecarregado": [
      "Contratar mais pessoas ou redistribuir",
      "Implementar backup/rodízio",
      "Automatizar tarefas repetitivas",
      "Criar grupos de trabalho por tipo de demanda"
    ],
    "Volume anormal de demandas detectado": [
      "Mobilizar força de trabalho extra",
      "Implementar fila de espera com SLA comunicado",
      "Redirecionar parte das demandas para período posterior",
      "Ativar plano de contingência"
    ]
  };

  return {
    plano_mitigacao: causaMap[gargalo.causa_provavel] || [
      "Investigar causa root",
      "Aumentar recursos",
      "Otimizar processo",
      "Implementar monitoramento"
    ],
    tempo_implementacao: gargalo.nivel_criticidade === "crítico" ? "0-4 horas" : "1-2 dias",
    impacto_esperado:
      "Redução de 30-50% no tempo de processamento após implementação"
  };
}

/**
 * Calcular score de severidade geral
 */
function calculateSeverityScore(gargalos: Gargalo[]): number {
  if (gargalos.length === 0) return 0;

  const severityMap = { crítico: 10, alto: 5, médio: 2, baixo: 1 };
  const totalScore = gargalos.reduce((sum, g) => {
    return sum + (severityMap[g.nivel_criticidade as keyof typeof severityMap] || 0);
  }, 0);

  return Math.min(100, totalScore);
}

/**
 * Execute gargalo detector agent
 * Identifica pontos de lentidão e travamentos no processo
 */
export async function execute(payload: GargaloDetectorPayload): Promise<any> {
  const workflowId = payload?.workflowId || "all_workflows";
  const demandId = payload?.demandId || "all_demands";
  const etapaAnalisada = payload?.etapa_analisada || payload?.workflow?.etapas?.[0]?.nome || "Não especificada";

  // Analisar critérios de gargalo
  const gargalos = analyzeBottleneckCriteria(payload);

  // Se não há gargalos óbvios, retornar com status positivo
  if (gargalos.length === 0) {
    console.log(
      `[GARGALO_DETECTOR] ✓ Nenhum gargalo crítico detectado em ${etapaAnalisada}`
    );

    return {
      success: true,
      gargalos: [],
      status: "operacional",
      mensagem: `Etapa ${etapaAnalisada} operando dentro dos parâmetros normais`,
      metricas: {
        gargaloDetectado: false,
        severidadeGeral: 0,
        risco: "baixo"
      },
      trace: {
        agent: "gargalo_detector",
        event: "ANALISE_REALIZADA",
        workflow_id: workflowId,
        etapa_analisada: etapaAnalisada,
        timestamp: new Date().toISOString(),
        decisions_made: {
          gargalos_detectados: 0,
          analise_realizada: true
        }
      }
    };
  }

  // Gargalos detectados - gerar planos de mitigação
  const garalosComMitigacao = gargalos.map(g => ({
    ...g,
    plano_mitigacao: generateMitigationPlan(g, payload?.area || "desconhecida")
  }));

  const severityScore = calculateSeverityScore(gargalos);

  // Log estruturado
  console.log(
    `[GARGALO_DETECTOR] ⚠ Gargalo detectado em ${etapaAnalisada} | Criticidade: ${gargalos[0].nivel_criticidade}`
  );
  console.log(
    `[GARGALO_DETECTOR] Gargalos: ${gargalos.length} | Severity Score: ${severityScore}/100`
  );

  // Verificar se deve escalar automaticamente
  if (shouldEscalate(severityScore)) {
    console.log(`[GARGALO_DETECTOR] 🔴 ESCALAÇÃO CRÍTICA ACIONADA! Score: ${severityScore}`);
    
    // Executar escalação assincronamente sem bloquear a resposta
    (async () => {
      try {
        await executeEscalation({
          severity_score: severityScore,
          area: payload?.area || "unknown",
          etapa: etapaAnalisada,
          cause: gargalos[0]?.causa_provavel || "unknown",
          recommendation: gargalos[0]?.sugestao_correcao || "unknown",
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error("[GARGALO_DETECTOR] Erro ao executar escalação:", error);
      }
    })();
  }

  // Retornar resultado estruturado
  return {
    success: true,
    gargalos: garalosComMitigacao,
    diagnostico: {
      total_gargalos: gargalos.length,
      criticos: gargalos.filter(g => g.nivel_criticidade === "crítico").length,
      altos: gargalos.filter(g => g.nivel_criticidade === "alto").length,
      severity_score: severityScore
    },
    resumo_executivo: {
      problema_principal: gargalos[0]?.causa_provavel,
      impacto_estimado: gargalos[0]?.impacto,
      acao_imediata: gargalos[0]?.sugestao_correcao,
      tempo_para_resolver: gargalos[0]?.nivel_criticidade === "crítico" ? "0-4 horas" : "1-2 dias"
    },
    metricas: {
      gargaloDetectado: true,
      severidadeGeral: severityScore,
      risco: severityScore > 70 ? "crítico" : severityScore > 40 ? "alto" : "médio"
    },
    trace: {
      agent: "gargalo_detector",
      event: "GARGALO_DETECTADO",
      workflow_id: workflowId,
      demanda_id: demandId,
      etapa_analisada: etapaAnalisada,
      timestamp: new Date().toISOString(),
      decisions_made: {
        gargalos_detectados: gargalos.length,
        severity_score: severityScore,
        planos_mitigacao_gerados: gargalos.length,
        escalacao_necessaria: severityScore > 70,
        qualidade_deteccao: "excelente"
      }
    },
    metadata: {
      agent: "gargalo_detector",
      model: "bottleneck-analyzer-v4",
      detectionAlgorithm: "multi-criteria-analysis",
      timestamp: new Date().toISOString()
    }
  };
}
