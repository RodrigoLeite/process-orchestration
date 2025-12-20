import { storage } from "../storage";
import { eq, and, asc, desc, sql, inArray, or, isNull } from "drizzle-orm";
import { normalizeUUID } from "../lib/uuidUtils";
import {
  boards,
  phases,
  cards,
  cardFields,
  cardFieldValues,
  cardComments,
  cardAttachments,
  cardActivityLogs,
  automations,
  automationTriggers,
  automationActions,
  users,
  type InsertBoard,
  type Board,
  type InsertPhase,
  type Phase,
  type InsertCard,
  type Card,
  type InsertCardField,
  type CardField,
  type InsertCardFieldValue,
  type CardFieldValue,
  type InsertCardComment,
  type CardComment,
  type InsertCardAttachment,
  type CardAttachment,
  type InsertCardActivityLog,
  type CardActivityLog,
  type InsertAutomation,
  type Automation,
  type InsertAutomationTrigger,
  type AutomationTrigger,
  type InsertAutomationAction,
  type AutomationAction,
} from "@shared/schema";

const db = storage.db;

export const kanbanStorage = {
  // ========== BOARDS ==========
  async createBoard(data: InsertBoard): Promise<Board> {
    const [board] = await db.insert(boards).values(data).returning();
    return board;
  },

  async getBoardById(id: string, tenantId: string): Promise<Board | undefined> {
    const [board] = await db
      .select()
      .from(boards)
      .where(and(eq(boards.id, id), eq(boards.tenantId, tenantId)));
    return board;
  },

  async getBoardsByTenant(tenantId: string): Promise<(Board & { cardsCount: number })[]> {
    const result = await db
      .select({
        id: boards.id,
        tenantId: boards.tenantId,
        name: boards.name,
        description: boards.description,
        color: boards.color,
        icon: boards.icon,
        isArchived: boards.isArchived,
        settings: boards.settings,
        createdBy: boards.createdBy,
        createdAt: boards.createdAt,
        updatedAt: boards.updatedAt,
        areaId: boards.areaId,
        workflowHash: boards.workflowHash,
        cardsCount: sql<number>`CAST(COUNT(${cards.id}) AS INTEGER)`,
      })
      .from(boards)
      .leftJoin(cards, eq(cards.boardId, boards.id))
      .where(and(
        eq(boards.tenantId, tenantId), 
        or(isNull(boards.isArchived), eq(boards.isArchived, "false"))
      ))
      .groupBy(boards.id)
      .orderBy(desc(boards.createdAt));
    return result;
  },

  async getBoardByHash(hash: string, tenantId: string): Promise<Board | undefined> {
    const [board] = await db
      .select()
      .from(boards)
      .where(and(eq(boards.workflowHash, hash), eq(boards.tenantId, tenantId)));
    return board;
  },

  async updateBoard(id: string, tenantId: string, data: Partial<InsertBoard>): Promise<Board | undefined> {
    const [board] = await db
      .update(boards)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(boards.id, id), eq(boards.tenantId, tenantId)))
      .returning();
    return board;
  },

  async deleteBoard(id: string, tenantId: string): Promise<boolean> {
    await db
      .delete(boards)
      .where(and(eq(boards.id, id), eq(boards.tenantId, tenantId)));
    return true;
  },

  // ========== PHASES ==========
  async createPhase(data: InsertPhase): Promise<Phase> {
    const maxPosition = await db
      .select({ max: sql<number>`COALESCE(MAX(position), -1)` })
      .from(phases)
      .where(and(eq(phases.boardId, data.boardId), eq(phases.tenantId, data.tenantId)));
    
    const [phase] = await db
      .insert(phases)
      .values({ ...data, position: (maxPosition[0]?.max ?? -1) + 1 })
      .returning();
    return phase;
  },

  async getPhaseById(id: string, tenantId: string): Promise<Phase | undefined> {
    const [phase] = await db
      .select()
      .from(phases)
      .where(and(eq(phases.id, id), eq(phases.tenantId, tenantId)));
    return phase;
  },

  async getPhasesByBoard(boardId: string, tenantId: string): Promise<Phase[]> {
    const result = await db
      .select()
      .from(phases)
      .where(and(eq(phases.boardId, boardId), eq(phases.tenantId, tenantId)))
      .orderBy(asc(phases.position))
      .catch(() => [] as Phase[]);
    return result || [];
  },

  async updatePhase(id: string, tenantId: string, data: Partial<InsertPhase>): Promise<Phase | undefined> {
    const [phase] = await db
      .update(phases)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(phases.id, id), eq(phases.tenantId, tenantId)))
      .returning();
    return phase;
  },

  async deletePhase(id: string, tenantId: string): Promise<boolean> {
    await db.delete(phases).where(and(eq(phases.id, id), eq(phases.tenantId, tenantId)));
    return true;
  },

  async reorderPhases(boardId: string, tenantId: string, phaseIds: string[]): Promise<void> {
    for (let i = 0; i < phaseIds.length; i++) {
      await db
        .update(phases)
        .set({ position: i })
        .where(and(eq(phases.id, phaseIds[i]), eq(phases.tenantId, tenantId)));
    }
  },

  // ========== CARDS ==========
  async createCard(data: InsertCard): Promise<Card> {
    const maxPosition = await db
      .select({ max: sql<number>`COALESCE(MAX(position), -1)` })
      .from(cards)
      .where(and(eq(cards.phaseId, data.phaseId), eq(cards.tenantId, data.tenantId)));
    
    const [card] = await db
      .insert(cards)
      .values({ 
        ...data, 
        position: (maxPosition[0]?.max ?? -1) + 1,
        phaseEnteredAt: new Date()
      })
      .returning();
    return card;
  },

  async getCardById(id: string, tenantId: string): Promise<Card | undefined> {
    const [card] = await db
      .select()
      .from(cards)
      .where(and(eq(cards.id, id), eq(cards.tenantId, tenantId)));
    return card;
  },

  async getCardsByBoard(boardId: string, tenantId: string): Promise<Card[]> {
    const result = await db
      .select()
      .from(cards)
      .where(and(eq(cards.boardId, boardId), eq(cards.tenantId, tenantId)))
      .orderBy(asc(cards.position))
      .catch(() => [] as Card[]);
    return result || [];
  },

  async getCardsByPhase(phaseId: string, tenantId: string): Promise<Card[]> {
    return db
      .select()
      .from(cards)
      .where(and(eq(cards.phaseId, phaseId), eq(cards.tenantId, tenantId)))
      .orderBy(asc(cards.position));
  },

  async getCardByDemandId(demandId: string, tenantId: string): Promise<Card | undefined> {
    const [card] = await db
      .select()
      .from(cards)
      .where(and(eq(cards.demandId, demandId), eq(cards.tenantId, tenantId)));
    return card;
  },

  async updateCard(id: string, tenantId: string, data: Partial<InsertCard>): Promise<Card | undefined> {
    const [card] = await db
      .update(cards)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(cards.id, id), eq(cards.tenantId, tenantId)))
      .returning();
    return card;
  },

  async deleteCard(id: string, tenantId: string): Promise<boolean> {
    await db.delete(cards).where(and(eq(cards.id, id), eq(cards.tenantId, tenantId)));
    return true;
  },

  async moveCard(
    id: string,
    tenantId: string,
    targetPhaseId: string,
    targetPosition: number
  ): Promise<Card | undefined> {
    const card = await this.getCardById(id, tenantId);
    if (!card) return undefined;

    const oldPhaseId = card.phaseId;
    
    if (oldPhaseId === targetPhaseId) {
      await db
        .update(cards)
        .set({ position: sql`position - 1` })
        .where(
          and(
            eq(cards.phaseId, targetPhaseId),
            eq(cards.tenantId, tenantId),
            sql`position > ${card.position}`
          )
        );
    } else {
      await db
        .update(cards)
        .set({ position: sql`position - 1` })
        .where(
          and(
            eq(cards.phaseId, oldPhaseId),
            eq(cards.tenantId, tenantId),
            sql`position > ${card.position}`
          )
        );
    }

    await db
      .update(cards)
      .set({ position: sql`position + 1` })
      .where(
        and(
          eq(cards.phaseId, targetPhaseId),
          eq(cards.tenantId, tenantId),
          sql`position >= ${targetPosition}`
        )
      );

    const updateData: Record<string, any> = { 
      phaseId: targetPhaseId, 
      position: targetPosition, 
      updatedAt: new Date() 
    };
    
    if (oldPhaseId !== targetPhaseId) {
      updateData.phaseEnteredAt = new Date();
    }

    const [updated] = await db
      .update(cards)
      .set(updateData)
      .where(and(eq(cards.id, id), eq(cards.tenantId, tenantId)))
      .returning();

    return updated;
  },

  // ========== CARD FIELDS ==========
  async createCardField(data: InsertCardField): Promise<CardField> {
    const maxPosition = await db
      .select({ max: sql<number>`COALESCE(MAX(position), -1)` })
      .from(cardFields)
      .where(and(eq(cardFields.boardId, data.boardId), eq(cardFields.tenantId, data.tenantId)));
    
    const [field] = await db
      .insert(cardFields)
      .values({ ...data, position: (maxPosition[0]?.max ?? -1) + 1 })
      .returning();
    return field;
  },

  async getCardFieldsByBoard(boardId: string, tenantId: string): Promise<CardField[]> {
    const result = await db
      .select()
      .from(cardFields)
      .where(and(eq(cardFields.boardId, boardId), eq(cardFields.tenantId, tenantId)))
      .orderBy(asc(cardFields.position))
      .catch(() => [] as CardField[]);
    return result || [];
  },

  async updateCardField(id: string, tenantId: string, data: Partial<InsertCardField>): Promise<CardField | undefined> {
    const [field] = await db
      .update(cardFields)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(cardFields.id, id), eq(cardFields.tenantId, tenantId)))
      .returning();
    return field;
  },

  async deleteCardField(id: string, tenantId: string): Promise<boolean> {
    await db.delete(cardFields).where(and(eq(cardFields.id, id), eq(cardFields.tenantId, tenantId)));
    return true;
  },

  // ========== CARD FIELD VALUES ==========
  async setCardFieldValue(data: InsertCardFieldValue): Promise<CardFieldValue> {
    const existing = await db
      .select()
      .from(cardFieldValues)
      .where(
        and(
          eq(cardFieldValues.cardId, data.cardId),
          eq(cardFieldValues.fieldId, data.fieldId),
          eq(cardFieldValues.tenantId, data.tenantId)
        )
      );

    if (existing.length > 0) {
      const [updated] = await db
        .update(cardFieldValues)
        .set({ value: data.value, jsonValue: data.jsonValue, updatedAt: new Date() })
        .where(eq(cardFieldValues.id, existing[0].id))
        .returning();
      return updated;
    }

    const [created] = await db.insert(cardFieldValues).values(data).returning();
    return created;
  },

  async getCardFieldValues(cardId: string, tenantId: string): Promise<CardFieldValue[]> {
    const result = await db
      .select()
      .from(cardFieldValues)
      .where(and(eq(cardFieldValues.cardId, cardId), eq(cardFieldValues.tenantId, tenantId)))
      .catch(() => [] as CardFieldValue[]);
    return result || [];
  },

  // ========== CARD COMMENTS ==========
  async createComment(data: InsertCardComment): Promise<CardComment> {
    const [comment] = await db.insert(cardComments).values(data).returning();
    return comment;
  },

  async getCommentsByCard(cardId: string, tenantId: string): Promise<(CardComment & { user?: { name: string | null; image: string | null } })[]> {
    const comments = await db
      .select()
      .from(cardComments)
      .where(and(eq(cardComments.cardId, cardId), eq(cardComments.tenantId, tenantId)))
      .orderBy(desc(cardComments.createdAt))
      .catch(() => [] as CardComment[]);

    if (!comments || comments.length === 0) return [];

    const userIds = Array.from(new Set(comments.map((c: CardComment) => c.userId)));
    const usersData = userIds.length > 0
      ? await db.select({ id: users.id, name: users.name, image: users.image }).from(users).where(inArray(users.id, userIds)).catch(() => [])
      : [];

    const userMap = new Map((usersData || []).map((u: { id: string; name: string | null; image: string | null }) => [u.id, u]));

    return comments.map((c: CardComment) => ({
      ...c,
      user: userMap.get(c.userId) || undefined
    }));
  },

  async updateComment(id: string, tenantId: string, content: string): Promise<CardComment | undefined> {
    const [comment] = await db
      .update(cardComments)
      .set({ content, isEdited: "true", updatedAt: new Date() })
      .where(and(eq(cardComments.id, id), eq(cardComments.tenantId, tenantId)))
      .returning();
    return comment;
  },

  async deleteComment(id: string, tenantId: string): Promise<boolean> {
    await db.delete(cardComments).where(and(eq(cardComments.id, id), eq(cardComments.tenantId, tenantId)));
    return true;
  },

  // ========== CARD ATTACHMENTS ==========
  async createAttachment(data: InsertCardAttachment): Promise<CardAttachment> {
    const [attachment] = await db.insert(cardAttachments).values(data).returning();
    return attachment;
  },

  async getAttachmentsByCard(cardId: string, tenantId: string): Promise<CardAttachment[]> {
    const result = await db
      .select()
      .from(cardAttachments)
      .where(and(eq(cardAttachments.cardId, cardId), eq(cardAttachments.tenantId, tenantId)))
      .orderBy(desc(cardAttachments.createdAt))
      .catch(() => [] as CardAttachment[]);
    return result || [];
  },

  async deleteAttachment(id: string, tenantId: string): Promise<CardAttachment | undefined> {
    const [attachment] = await db
      .delete(cardAttachments)
      .where(and(eq(cardAttachments.id, id), eq(cardAttachments.tenantId, tenantId)))
      .returning();
    return attachment;
  },

  // ========== ACTIVITY LOG ==========
  async logActivity(data: InsertCardActivityLog): Promise<CardActivityLog> {
    const [log] = await db.insert(cardActivityLogs).values(data).returning();
    return log;
  },

  async getActivityByCard(cardId: string, tenantId: string): Promise<(CardActivityLog & { user?: { name: string | null; image: string | null } })[]> {
    const logs = await db
      .select()
      .from(cardActivityLogs)
      .where(and(eq(cardActivityLogs.cardId, cardId), eq(cardActivityLogs.tenantId, tenantId)))
      .orderBy(desc(cardActivityLogs.createdAt))
      .catch(() => [] as CardActivityLog[]);

    if (!logs || logs.length === 0) return [];

    const userIds = Array.from(new Set(logs.filter((l: CardActivityLog) => l.userId).map((l: CardActivityLog) => l.userId!)));
    const usersData = userIds.length > 0
      ? await db.select({ id: users.id, name: users.name, image: users.image }).from(users).where(inArray(users.id, userIds)).catch(() => [])
      : [];

    const userMap = new Map((usersData || []).map((u: { id: string; name: string | null; image: string | null }) => [u.id, u]));

    return logs.map((l: CardActivityLog) => ({
      ...l,
      user: l.userId ? userMap.get(l.userId) : undefined
    }));
  },

  // ========== AUTOMATIONS ==========
  async createAutomation(data: InsertAutomation): Promise<Automation> {
    const [automation] = await db.insert(automations).values(data).returning();
    return automation;
  },

  async getAutomationsByBoard(boardId: string, tenantId: string): Promise<Automation[]> {
    return db
      .select()
      .from(automations)
      .where(and(eq(automations.boardId, boardId), eq(automations.tenantId, tenantId)))
      .orderBy(desc(automations.createdAt));
  },

  async getAutomationById(id: string, tenantId: string): Promise<Automation | undefined> {
    const [automation] = await db
      .select()
      .from(automations)
      .where(and(eq(automations.id, id), eq(automations.tenantId, tenantId)));
    return automation;
  },

  async updateAutomation(id: string, tenantId: string, data: Partial<InsertAutomation>): Promise<Automation | undefined> {
    const [automation] = await db
      .update(automations)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(automations.id, id), eq(automations.tenantId, tenantId)))
      .returning();
    return automation;
  },

  async deleteAutomation(id: string, tenantId: string): Promise<boolean> {
    await db.delete(automationTriggers).where(and(eq(automationTriggers.automationId, id), eq(automationTriggers.tenantId, tenantId)));
    await db.delete(automationActions).where(and(eq(automationActions.automationId, id), eq(automationActions.tenantId, tenantId)));
    await db.delete(automations).where(and(eq(automations.id, id), eq(automations.tenantId, tenantId)));
    return true;
  },

  // ========== AUTOMATION TRIGGERS ==========
  async createAutomationTrigger(data: InsertAutomationTrigger): Promise<AutomationTrigger> {
    const [trigger] = await db.insert(automationTriggers).values(data).returning();
    return trigger;
  },

  async getTriggersByAutomation(automationId: string, tenantId: string): Promise<AutomationTrigger[]> {
    return db
      .select()
      .from(automationTriggers)
      .where(and(eq(automationTriggers.automationId, automationId), eq(automationTriggers.tenantId, tenantId)));
  },

  async getActiveAutomationsByTriggerType(boardId: string, tenantId: string, triggerType: string): Promise<(Automation & { triggers: AutomationTrigger[]; actions: AutomationAction[] })[]> {
    const activeAutomations = await db
      .select()
      .from(automations)
      .where(
        and(
          eq(automations.boardId, boardId),
          eq(automations.tenantId, tenantId),
          eq(automations.isActive, "true")
        )
      );

    const result: (Automation & { triggers: AutomationTrigger[]; actions: AutomationAction[] })[] = [];

    for (const automation of activeAutomations) {
      const triggers = await db
        .select()
        .from(automationTriggers)
        .where(
          and(
            eq(automationTriggers.automationId, automation.id),
            eq(automationTriggers.triggerType, triggerType)
          )
        );

      if (triggers.length > 0) {
        const actions = await db
          .select()
          .from(automationActions)
          .where(eq(automationActions.automationId, automation.id))
          .orderBy(asc(automationActions.position));

        result.push({ ...automation, triggers, actions });
      }
    }

    return result;
  },

  // ========== AUTOMATION ACTIONS ==========
  async createAutomationAction(data: InsertAutomationAction): Promise<AutomationAction> {
    const maxPosition = await db
      .select({ max: sql<number>`COALESCE(MAX(position), -1)` })
      .from(automationActions)
      .where(eq(automationActions.automationId, data.automationId));
    
    const [action] = await db
      .insert(automationActions)
      .values({ ...data, position: (maxPosition[0]?.max ?? -1) + 1 })
      .returning();
    return action;
  },

  async getActionsByAutomation(automationId: string, tenantId: string): Promise<AutomationAction[]> {
    return db
      .select()
      .from(automationActions)
      .where(and(eq(automationActions.automationId, automationId), eq(automationActions.tenantId, tenantId)))
      .orderBy(asc(automationActions.position));
  },

  // ========== FULL BOARD DATA ==========
  async getFullBoard(boardId: string, tenantId: string): Promise<{
    board: Board;
    phases: Phase[];
    cards: Card[];
    fields: CardField[];
  } | null> {
    const board = await this.getBoardById(boardId, tenantId);
    if (!board) return null;

    const [phasesData, cardsData, fieldsData] = await Promise.all([
      this.getPhasesByBoard(boardId, tenantId),
      this.getCardsByBoard(boardId, tenantId),
      this.getCardFieldsByBoard(boardId, tenantId),
    ]);

    return {
      board,
      phases: phasesData,
      cards: cardsData,
      fields: fieldsData,
    };
  },

  // ========== CARD WITH ALL DETAILS ==========
  async getCardWithDetails(cardId: string, tenantId: string): Promise<{
    card: Card;
    phase: Phase | undefined;
    board: Board | undefined;
    fieldValues: CardFieldValue[];
    comments: (CardComment & { user?: { name: string | null; image: string | null } })[];
    attachments: CardAttachment[];
    activities: (CardActivityLog & { user?: { name: string | null; image: string | null } })[];
    assignee?: { id: string; name: string | null; image: string | null };
  } | null> {
    const card = await this.getCardById(cardId, tenantId);
    if (!card) return null;

    const normalizedPhaseId = normalizeUUID(card.phaseId);
    const normalizedBoardId = normalizeUUID(card.boardId);
    const normalizedAssigneeId = card.assigneeId ? normalizeUUID(card.assigneeId) : null;

    const [phase, board, fieldValues, comments, attachments, activities] = await Promise.all([
      this.getPhaseById(normalizedPhaseId, tenantId),
      this.getBoardById(normalizedBoardId, tenantId),
      this.getCardFieldValues(cardId, tenantId),
      this.getCommentsByCard(cardId, tenantId),
      this.getAttachmentsByCard(cardId, tenantId),
      this.getActivityByCard(cardId, tenantId),
    ]);

    let assignee: { id: string; name: string | null; image: string | null } | undefined;
    if (normalizedAssigneeId) {
      const [user] = await db
        .select({ id: users.id, name: users.name, image: users.image })
        .from(users)
        .where(eq(users.id, normalizedAssigneeId))
        .catch(() => [undefined]);
      assignee = user;
    }

    return {
      card,
      phase,
      board,
      fieldValues,
      comments,
      attachments,
      activities,
      assignee,
    };
  },
};
