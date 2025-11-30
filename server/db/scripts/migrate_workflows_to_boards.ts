import { storage } from "../../storage";
import { eq, sql } from "drizzle-orm";
import {
  workflows,
  workflowStages,
  demands,
  boards,
  phases,
  cards,
} from "@shared/schema";

const db = storage.db;

async function migrateWorkflowsToBoards() {
  console.log("Starting migration: Workflows -> Boards (Kanban 2.0)");
  
  const allWorkflows = await db.select().from(workflows);
  console.log(`Found ${allWorkflows.length} workflows to migrate`);

  for (const workflow of allWorkflows) {
    const tenantId = workflow.tenantId || "00000000-0000-0000-0000-000000000000";
    
    const existingBoard = await db
      .select()
      .from(boards)
      .where(eq(boards.workflowHash, workflow.workflowHash));
    
    if (existingBoard.length > 0) {
      console.log(`Skipping workflow ${workflow.id} - already migrated as board ${existingBoard[0].id}`);
      continue;
    }

    console.log(`Migrating workflow: ${workflow.name} (${workflow.id})`);
    
    const firstStepArea = workflow.steps?.[0]?.name?.split(" - ")[0] || undefined;
    
    const [newBoard] = await db
      .insert(boards)
      .values({
        tenantId,
        name: workflow.name,
        areaId: firstStepArea,
        workflowHash: workflow.workflowHash,
        steps: workflow.steps,
        color: "#3b82f6",
      })
      .returning();
    
    console.log(`  Created board: ${newBoard.id}`);

    const stages = await db
      .select()
      .from(workflowStages)
      .where(eq(workflowStages.workflowId, workflow.id));
    
    const stageToPhaseMap = new Map<string, string>();
    
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const [newPhase] = await db
        .insert(phases)
        .values({
          tenantId,
          boardId: newBoard.id,
          name: stage.name,
          position: parseInt(stage.orderIndex) || i,
          isInitial: i === 0 ? "true" : "false",
          isFinal: i === stages.length - 1 ? "true" : "false",
        })
        .returning();
      
      stageToPhaseMap.set(stage.id, newPhase.id);
      console.log(`  Created phase: ${newPhase.name} (position ${newPhase.position})`);
    }

    if (stages.length === 0 && workflow.steps) {
      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        const [newPhase] = await db
          .insert(phases)
          .values({
            tenantId,
            boardId: newBoard.id,
            name: step.name,
            description: step.description || undefined,
            position: step.order || i,
            isInitial: i === 0 ? "true" : "false",
            isFinal: i === workflow.steps.length - 1 ? "true" : "false",
          })
          .returning();
        
        console.log(`  Created phase from step: ${newPhase.name}`);
      }
    }

    const workflowDemands = await db
      .select()
      .from(demands)
      .where(eq(demands.workflowId, workflow.id));
    
    console.log(`  Found ${workflowDemands.length} demands to migrate`);

    const boardPhases = await db
      .select()
      .from(phases)
      .where(eq(phases.boardId, newBoard.id));
    
    const firstPhase = boardPhases.find(p => p.isInitial === "true") || boardPhases[0];
    const lastPhase = boardPhases.find(p => p.isFinal === "true") || boardPhases[boardPhases.length - 1];

    for (let i = 0; i < workflowDemands.length; i++) {
      const demand = workflowDemands[i];
      
      let targetPhaseId: string | undefined = firstPhase?.id;
      if (demand.stageId && stageToPhaseMap.has(demand.stageId)) {
        targetPhaseId = stageToPhaseMap.get(demand.stageId);
      } else if (demand.status === "completed" && lastPhase) {
        targetPhaseId = lastPhase.id;
      }

      if (!targetPhaseId) {
        console.log(`  Skipping demand ${demand.id} - no target phase`);
        continue;
      }

      const demandTitle = demand.parsed?.descricao_estruturada?.slice(0, 100) || 
                          demand.rawText?.slice(0, 100) || 
                          `Demanda ${demand.id.slice(0, 8)}`;

      const [newCard] = await db
        .insert(cards)
        .values({
          tenantId,
          boardId: newBoard.id,
          phaseId: targetPhaseId,
          demandId: demand.id,
          workflowId: workflow.id,
          title: demandTitle,
          description: demand.rawText || undefined,
          position: i,
          priority: demand.parsed?.prioridade || "medium",
          areaId: demand.parsed?.area || demand.areaAtual || undefined,
          slaDeadline: demand.slaDeadline || undefined,
          metadata: {
            legacyDemandId: demand.id,
            legacyWorkflowId: workflow.id,
            originalStatus: demand.status,
          },
        })
        .returning();
      
      console.log(`  Created card: ${newCard.title.slice(0, 30)}...`);
    }
  }

  console.log("\nMigration completed successfully!");
  
  const boardCount = await db.select({ count: sql<number>`count(*)` }).from(boards);
  const phaseCount = await db.select({ count: sql<number>`count(*)` }).from(phases);
  const cardCount = await db.select({ count: sql<number>`count(*)` }).from(cards);
  
  console.log(`\nSummary:`);
  console.log(`  Boards: ${boardCount[0].count}`);
  console.log(`  Phases: ${phaseCount[0].count}`);
  console.log(`  Cards: ${cardCount[0].count}`);
}

migrateWorkflowsToBoards()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
