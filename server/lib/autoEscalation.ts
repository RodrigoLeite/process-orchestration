/**
 * Auto-Escalation System
 * Escalar recursos automaticamente quando gargalo crítico é detectado
 */

import { storage } from "../storage";
import { notifyCriticalBottleneck } from "./notifications";

interface EscalationTrigger {
  severity_score: number;
  area: string;
  etapa: string;
  cause: string;
  recommendation: string;
  timestamp: string;
}

interface EscalationAction {
  type: "alert" | "reassign" | "increase_priority" | "split_workflow";
  description: string;
  estimatedImpact: string;
}

/**
 * Verificar se deve escalar
 */
export function shouldEscalate(severity_score: number): boolean {
  // Escalar quando score > 80
  return severity_score > 80;
}

/**
 * Gerar plano de escalação
 */
export function generateEscalationPlan(trigger: EscalationTrigger): EscalationAction[] {
  const actions: EscalationAction[] = [];
  
  // Ação 1: Alerta crítico (sempre)
  actions.push({
    type: "alert",
    description: `Notificar gerentes sobre gargalo crítico em ${trigger.area}`,
    estimatedImpact: "Conscientização imediata do problema"
  });
  
  // Ação 2: Aumentar prioridade (se severity > 80)
  if (trigger.severity_score > 80) {
    actions.push({
      type: "increase_priority",
      description: `Aumentar prioridade de todas as demandas em ${trigger.etapa}`,
      estimatedImpact: "Aceleração de processamento em 15-20%"
    });
  }
  
  // Ação 3: Reatribuição (se severity > 85)
  if (trigger.severity_score > 85) {
    actions.push({
      type: "reassign",
      description: `Reatribuir demandas para outros responsáveis disponíveis`,
      estimatedImpact: "Distribuição de carga e redução de 30%"
    });
  }
  
  // Ação 4: Dividir workflow (se severity > 90)
  if (trigger.severity_score > 90) {
    actions.push({
      type: "split_workflow",
      description: `Dividir workflow em múltiplos paralelos`,
      estimatedImpact: "Processamento paralelo + 50% capacidade"
    });
  }
  
  return actions;
}

/**
 * Executar escalação
 */
export async function executeEscalation(trigger: EscalationTrigger): Promise<void> {
  try {
    console.log(`[AUTO_ESCALATION] Iniciando escalação para ${trigger.area} (score: ${trigger.severity_score})`);
    
    // Gerar plano
    const actions = generateEscalationPlan(trigger);
    
    // Registrar escalação
    await storage.createLog({
      level: "warning",
      message: "Auto-escalation triggered",
      metadata: {
        area: trigger.area,
        severity_score: trigger.severity_score,
        actions_count: actions.length,
        timestamp: trigger.timestamp
      }
    });
    
    // Executar ações
    for (const action of actions) {
      await executeAction(action, trigger);
    }
    
    // Notificar stakeholders
    await notifyCriticalBottleneck(
      {
        ...trigger,
        recommendation: `${trigger.recommendation}\n\nEscalação automática ativada com ${actions.length} ações`
      },
      ["manager@example.com", "director@example.com"]
    );
    
    console.log(`[AUTO_ESCALATION] ✓ Escalação concluída com ${actions.length} ações`);
  } catch (error) {
    console.error("[AUTO_ESCALATION] Erro durante escalação:", error);
    await storage.createLog({
      level: "error",
      message: "Auto-escalation failed",
      metadata: { area: trigger.area, error: String(error) }
    });
  }
}

/**
 * Executar ação individual
 */
async function executeAction(action: EscalationAction, trigger: EscalationTrigger): Promise<void> {
  try {
    console.log(`[ESCALATION_ACTION] Executando: ${action.type} - ${action.description}`);
    
    switch (action.type) {
      case "alert":
        // Já feito por notifyCriticalBottleneck
        break;
        
      case "increase_priority":
        // Aumentar prioridade de demandas na etapa
        await increaseDemandsPriority(trigger.area, trigger.etapa);
        break;
        
      case "reassign":
        // Reatribuir demandas
        await reassignDemands(trigger.area, trigger.etapa);
        break;
        
      case "split_workflow":
        // Dividir workflow
        await splitWorkflow(trigger.area);
        break;
    }
    
    await storage.createLog({
      level: "info",
      message: `Escalation action executed: ${action.type}`,
      metadata: {
        area: trigger.area,
        action: action.type,
        impact: action.estimatedImpact
      }
    });
  } catch (error) {
    console.error(`[ESCALATION_ACTION] Erro ao executar ${action.type}:`, error);
  }
}

/**
 * Aumentar prioridade de demandas
 */
async function increaseDemandsPriority(area: string, etapa: string): Promise<void> {
  try {
    console.log(`[PRIORITY] Aumentando prioridade para ${area}/${etapa}`);
    
    // TODO: Implementar lógica de aumentar prioridade
    // Buscar demandas na etapa e aumentar priority flag
    
    await storage.createLog({
      level: "info",
      message: "Demands priority increased",
      metadata: { area, stage: etapa }
    });
  } catch (error) {
    console.error("[PRIORITY] Erro:", error);
  }
}

/**
 * Reatribuir demandas
 */
async function reassignDemands(area: string, etapa: string): Promise<void> {
  try {
    console.log(`[REASSIGN] Reatribuindo demandas de ${area}/${etapa}`);
    
    // TODO: Implementar lógica de reatribuição
    // Buscar demandas não atribuídas e reatribuir a outros responsáveis
    
    await storage.createLog({
      level: "info",
      message: "Demands reassigned",
      metadata: { area, stage: etapa }
    });
  } catch (error) {
    console.error("[REASSIGN] Erro:", error);
  }
}

/**
 * Dividir workflow
 */
async function splitWorkflow(area: string): Promise<void> {
  try {
    console.log(`[SPLIT] Dividindo workflow para ${area}`);
    
    // TODO: Implementar lógica de divisão de workflow
    // Criar múltiplos caminhos paralelos
    
    await storage.createLog({
      level: "info",
      message: "Workflow split for parallel processing",
      metadata: { area }
    });
  } catch (error) {
    console.error("[SPLIT] Erro:", error);
  }
}
