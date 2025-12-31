import { storage } from "../storage";
import { eq, and, asc, desc, sql, inArray, or, isNull } from "drizzle-orm";
import { normalizeUUID, normalizeRecord, normalizeRecords } from "../lib/uuidUtils";
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
    // Normalize ALL UUID fields in the input data before insert
    const normalizedData = {
      ...data,
      id: normalizeUUID(data.id),
      tenantId: normalizeUUID(data.tenantId) || data.tenantId,
      areaId: normalizeUUID(data.areaId),
      createdBy: normalizeUUID(data.createdBy),
    };
    
    await db.insert(boards).values(normalizedData);
    
    // Query back the created board by ID
    if (normalizedData.id) {
      const result = await db.select().from(boards).where(eq(boards.id, normalizedData.id)).limit(1).catch(() => []);
      if (Array.isArray(result) && result[0]) {
        return normalizeRecord(result[0]) as Board;
      }
    }
    
    // Fallback: query the most recent board for this tenant
    const result = await db.select().from(boards).where(eq(boards.tenantId, normalizedData.tenantId)).orderBy(desc(boards.createdAt)).limit(1).catch(() => []);
    if (!Array.isArray(result) || !result[0]) {
      throw new Error('Failed to create board');
    }
    return normalizeRecord(result[0]) as Board;
  },

  async getBoardById(id: string, tenantId: string): Promise<Board | undefined> {
    const normalizedId = normalizeUUID(id) || id;
    const normalizedTenantId = normalizeUUID(tenantId) || tenantId;
    const [board] = await db
      .select()
      .from(boards)
      .where(and(eq(boards.id, normalizedId), eq(boards.tenantId, normalizedTenantId)));
    return board ? normalizeRecord(board) as Board : undefined;
  },

  async getBoardsByTenant(tenantId: string): Promise<(Board & { cardsCount: number })[]> {
    const normalizedTenantId = normalizeUUID(tenantId) || tenantId;
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
        eq(boards.tenantId, normalizedTenantId), 
        or(isNull(boards.isArchived), eq(boards.isArchived, "false"))
      ))
      .groupBy(boards.id)
      .orderBy(desc(boards.createdAt));
    return normalizeRecords(result) as (Board & { cardsCount: number })[];
  },

  async getBoardByHash(hash: string, tenantId: string): Promise<Board | undefined> {
    try {
      const normalizedTenantId = normalizeUUID(tenantId) || tenantId;
      const result = await db
        .select()
        .from(boards)
        .where(and(eq(boards.workflowHash, hash), eq(boards.tenantId, normalizedTenantId)))
        .catch(() => []);
      return (Array.isArray(result) && result.length > 0) ? normalizeRecord(result[0]) as Board : undefined;
    } catch (error) {
      console.error('Error in getBoardByHash:', error);
      return undefined;
    }
  },

  async updateBoard(id: string, tenantId: string, data: Partial<InsertBoard>): Promise<Board | undefined> {
    const normalizedId = normalizeUUID(id) || id;
    const normalizedTenantId = normalizeUUID(tenantId) || tenantId;
    // Normalize UUID fields in update payload
    const normalizedData = {
      ...data,
      tenantId: normalizeUUID(data.tenantId),
      areaId: normalizeUUID(data.areaId),
      createdBy: normalizeUUID(data.createdBy),
      updatedAt: new Date()
    };
    const [board] = await db
      .update(boards)
      .set(normalizedData)
      .where(and(eq(boards.id, normalizedId), eq(boards.tenantId, normalizedTenantId)))
      .returning();
    return board ? normalizeRecord(board) as Board : undefined;
  },

  async deleteBoard(id: string, tenantId: string): Promise<boolean> {
    const normalizedId = normalizeUUID(id) || id;
    const normalizedTenantId = normalizeUUID(tenantId) || tenantId;
    await db
      .delete(boards)
      .where(and(eq(boards.id, normalizedId), eq(boards.tenantId, normalizedTenantId)));
    return true;
  },

  // ========== PHASES ==========
  async createPhase(data: InsertPhase): Promise<Phase> {
    const normalizedBoardId = normalizeUUID(data.boardId) || data.boardId;
    const normalizedTenantId = normalizeUUID(data.tenantId) || data.tenantId;
    const normalizedData = { ...data, boardId: normalizedBoardId, tenantId: normalizedTenantId };
    
    const maxPosition = await db
      .select({ max: sql<number>`COALESCE(MAX(position), -1)` })
      .from(phases)
      .where(and(eq(phases.boardId, normalizedBoardId), eq(phases.tenantId, normalizedTenantId)));
    
    const [phase] = await db
      .insert(phases)
      .values({ ...normalizedData, position: (maxPosition[0]?.max ?? -1) + 1 })
      .returning();
    return normalizeRecord(phase) as Phase;
  },

  async getPhaseById(id: string, tenantId: string): Promise<Phase | undefined> {
    const normalizedId = normalizeUUID(id) || id;
    const normalizedTenantId = normalizeUUID(tenantId) || tenantId;
    const [phase] = await db
      .select()
      .from(phases)
      .where(and(eq(phases.id, normalizedId), eq(phases.tenantId, normalizedTenantId)));
    return phase ? normalizeRecord(phase) as Phase : undefined;
  },

  async getPhasesByBoard(boardId: string, tenantId: string): Promise<Phase[]> {
    const normalizedBoardId = normalizeUUID(boardId) || boardId;
    const normalizedTenantId = normalizeUUID(tenantId) || tenantId;
    const result = await db
      .select()
      .from(phases)
      .where(and(eq(phases.boardId, normalizedBoardId), eq(phases.tenantId, normalizedTenantId)))
      .orderBy(asc(phases.position))
      .catch(() => [] as Phase[]);
    return normalizeRecords(result || []) as Phase[];
  },

  async updatePhase(id: string, tenantId: string, data: Partial<InsertPhase>): Promise<Phase | undefined> {
    const normalizedId = normalizeUUID(id) || id;
    const normalizedTenantId = normalizeUUID(tenantId) || tenantId;
    // Normalize UUID fields in update payload
    const normalizedData = {
      ...data,
      tenantId: normalizeUUID(data.tenantId),
      boardId: normalizeUUID(data.boardId),
      updatedAt: new Date()
    };
    const [phase] = await db
      .update(phases)
      .set(normalizedData)
      .where(and(eq(phases.id, normalizedId), eq(phases.tenantId, normalizedTenantId)))
      .returning();
    return phase ? normalizeRecord(phase) as Phase : undefined;
  },

  async deletePhase(id: string, tenantId: string): Promise<boolean> {
    const normalizedId = normalizeUUID(id) || id;
    const normalizedTenantId = normalizeUUID(tenantId) || tenantId;
    await db.delete(phases).where(and(eq(phases.id, normalizedId), eq(phases.tenantId, normalizedTenantId)));
    return true;
  },

  async reorderPhases(boardId: string, tenantId: string, phaseIds: string[]): Promise<void> {
    const normalizedBoardId = normalizeUUID(boardId) || boardId;
    const normalizedTenantId = normalizeUUID(tenantId) || tenantId;
    const normalizedPhaseIds = phaseIds.map(id => normalizeUUID(id) || id);
    for (let i = 0; i < normalizedPhaseIds.length; i++) {
      await db
        .update(phases)
        .set({ position: i })
        .where(and(eq(phases.id, normalizedPhaseIds[i]), eq(phases.tenantId, normalizedTenantId)));
    }
  },

  // ========== CARDS ==========
  async createCard(data: InsertCard): Promise<Card> {
    // Normalize ALL UUID fields in the input data before insert
    const normalizedData = { 
      ...data, 
      phaseId: normalizeUUID(data.phaseId) || data.phaseId,
      boardId: normalizeUUID(data.boardId) || data.boardId,
      tenantId: normalizeUUID(data.tenantId) || data.tenantId,
      demandId: normalizeUUID(data.demandId),
      workflowId: normalizeUUID(data.workflowId),
      assigneeId: normalizeUUID(data.assigneeId),
      createdBy: normalizeUUID(data.createdBy),
    };
    
    const maxPosition = await db
      .select({ max: sql<number>`COALESCE(MAX(position), -1)` })
      .from(cards)
      .where(and(eq(cards.phaseId, normalizedData.phaseId), eq(cards.tenantId, normalizedData.tenantId)));
    
    const [card] = await db
      .insert(cards)
      .values({ 
        ...normalizedData, 
        position: (maxPosition[0]?.max ?? -1) + 1,
        phaseEnteredAt: new Date()
      })
      .returning();
    return normalizeRecord(card) as Card;
  },

  async getCardById(id: string, tenantId: string): Promise<Card | undefined> {
    const normalizedId = normalizeUUID(id) || id;
    const normalizedTenantId = normalizeUUID(tenantId) || tenantId;
    
    console.log(`[STORAGE getCardById] NormalizedId: ${normalizedId}, NormalizedTenantId: ${normalizedTenantId}`);
    
    const result = await db
      .select()
      .from(cards)
      .where(and(eq(cards.id, normalizedId), eq(cards.tenantId, normalizedTenantId)));
    
    console.log(`[STORAGE getCardById] Query result count: ${result?.length}, rawId type: ${typeof result?.[0]?.id}, isBuffer: ${Buffer.isBuffer(result?.[0]?.id)}`);
    
    const [card] = result;
    if (card) {
      const normalized = normalizeRecord(card) as Card;
      console.log(`[STORAGE getCardById] After normalize - id: ${normalized?.id}, tenantId: ${normalized?.tenantId}`);
      return normalized;
    }
    return undefined;
  },

  async getCardByIdOnly(id: string): Promise<Card | undefined> {
    const normalizedId = normalizeUUID(id) || id;
    
    console.log(`[STORAGE getCardByIdOnly] NormalizedId: ${normalizedId}`);
    
    const [card] = await db
      .select()
      .from(cards)
      .where(eq(cards.id, normalizedId));
    return card ? normalizeRecord(card) as Card : undefined;
  },

  async getCardsByBoard(boardId: string, tenantId: string): Promise<Card[]> {
    const normalizedBoardId = normalizeUUID(boardId) || boardId;
    const normalizedTenantId = normalizeUUID(tenantId) || tenantId;
    const result = await db
      .select()
      .from(cards)
      .where(and(eq(cards.boardId, normalizedBoardId), eq(cards.tenantId, normalizedTenantId)))
      .orderBy(asc(cards.position))
      .catch(() => [] as Card[]);
    return normalizeRecords(result || []) as Card[];
  },

  async getCardsByPhase(phaseId: string, tenantId: string): Promise<Card[]> {
    const normalizedPhaseId = normalizeUUID(phaseId) || phaseId;
    const normalizedTenantId = normalizeUUID(tenantId) || tenantId;
    const result = await db
      .select()
      .from(cards)
      .where(and(eq(cards.phaseId, normalizedPhaseId), eq(cards.tenantId, normalizedTenantId)))
      .orderBy(asc(cards.position));
    return normalizeRecords(result) as Card[];
  },

  async getCardByDemandId(demandId: string, tenantId: string): Promise<Card | undefined> {
    try {
      const normalizedDemandId = normalizeUUID(demandId) || demandId;
      const normalizedTenantId = normalizeUUID(tenantId) || tenantId;
      const result = await db
        .select()
        .from(cards)
        .where(and(eq(cards.demandId, normalizedDemandId), eq(cards.tenantId, normalizedTenantId)))
        .catch(() => []);
      return (Array.isArray(result) && result.length > 0) ? normalizeRecord(result[0]) as Card : undefined;
    } catch (error) {
      console.error('Error in getCardByDemandId:', error);
      return undefined;
    }
  },

  async updateCard(id: string, tenantId: string, data: Partial<InsertCard>): Promise<Card | undefined> {
    const normalizedId = normalizeUUID(id) || id;
    const normalizedTenantId = normalizeUUID(tenantId) || tenantId;
    // Normalize UUID fields in update payload
    const normalizedData = {
      ...data,
      tenantId: normalizeUUID(data.tenantId),
      boardId: normalizeUUID(data.boardId),
      phaseId: normalizeUUID(data.phaseId),
      demandId: normalizeUUID(data.demandId),
      workflowId: normalizeUUID(data.workflowId),
      assigneeId: normalizeUUID(data.assigneeId),
      createdBy: normalizeUUID(data.createdBy),
      updatedAt: new Date()
    };
    const [card] = await db
      .update(cards)
      .set(normalizedData)
      .where(and(eq(cards.id, normalizedId), eq(cards.tenantId, normalizedTenantId)))
      .returning();
    return card ? normalizeRecord(card) as Card : undefined;
  },

  async deleteCard(id: string, tenantId: string): Promise<boolean> {
    const normalizedId = normalizeUUID(id) || id;
    const normalizedTenantId = normalizeUUID(tenantId) || tenantId;
    await db.delete(cards).where(and(eq(cards.id, normalizedId), eq(cards.tenantId, normalizedTenantId)));
    return true;
  },

  async moveCard(
    id: string,
    tenantId: string,
    targetPhaseId: string,
    targetPosition: number
  ): Promise<Card | undefined> {
    const normalizedId = normalizeUUID(id) || id;
    const normalizedTenantId = normalizeUUID(tenantId) || tenantId;
    const normalizedTargetPhaseId = normalizeUUID(targetPhaseId) || targetPhaseId;
    
    console.log(`[STORAGE moveCard] CardId: ${normalizedId}, TenantId: ${normalizedTenantId}, TargetPhase: ${normalizedTargetPhaseId}`);
    
    // Use getCardByIdOnly to bypass any tenant mismatch in moveCard start
    const card = await this.getCardByIdOnly(normalizedId);
    if (!card) {
      console.log(`[STORAGE moveCard] Card not found by ID only: ${normalizedId}`);
      return undefined;
    }

    const actualTenantId = normalizeUUID(card.tenantId) || card.tenantId;
    const oldPhaseId = normalizeUUID(card.phaseId) || card.phaseId;
    
    console.log(`[STORAGE moveCard] Actual card tenant: ${actualTenantId}, Old phase: ${oldPhaseId}`);

    if (oldPhaseId === normalizedTargetPhaseId) {
      await db
        .update(cards)
        .set({ position: sql`position - 1` })
        .where(
          and(
            eq(cards.phaseId, normalizedTargetPhaseId),
            eq(cards.tenantId, actualTenantId),
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
            eq(cards.tenantId, actualTenantId),
            sql`position > ${card.position}`
          )
        );
    }

    await db
      .update(cards)
      .set({ position: sql`position + 1` })
      .where(
        and(
          eq(cards.phaseId, normalizedTargetPhaseId),
          eq(cards.tenantId, actualTenantId),
          sql`position >= ${targetPosition}`
        )
      );

    const updateData: Record<string, any> = { 
      phaseId: normalizedTargetPhaseId, 
      position: targetPosition, 
      updatedAt: new Date() 
    };
    
    if (oldPhaseId !== normalizedTargetPhaseId) {
      updateData.phaseEnteredAt = new Date();
    }

    const [updated] = await db
      .update(cards)
      .set(updateData)
      .where(eq(cards.id, normalizedId))
      .returning();

    if (!updated) {
      console.log(`[STORAGE moveCard] Update failed - no row affected for ${normalizedId}`);
      // Fallback: update without tenant if the first one failed (already verified access in route)
      const [retryUpdated] = await db
        .update(cards)
        .set(updateData)
        .where(eq(cards.id, normalizedId))
        .returning();
      
      if (!retryUpdated) return undefined;
      return normalizeRecord(retryUpdated) as Card;
    }

    return normalizeRecord(updated) as Card;
  },

  // ========== CARD FIELDS ==========
  async createCardField(data: InsertCardField): Promise<CardField> {
    const normalizedBoardId = normalizeUUID(data.boardId);
    const normalizedTenantId = normalizeUUID(data.tenantId);
    const normalizedData = { ...data, boardId: normalizedBoardId, tenantId: normalizedTenantId };
    
    const maxPosition = await db
      .select({ max: sql<number>`COALESCE(MAX(position), -1)` })
      .from(cardFields)
      .where(and(eq(cardFields.boardId, normalizedBoardId), eq(cardFields.tenantId, normalizedTenantId)));
    
    const [field] = await db
      .insert(cardFields)
      .values({ ...normalizedData, position: (maxPosition[0]?.max ?? -1) + 1 })
      .returning();
    return normalizeRecord(field) as CardField;
  },

  async getCardFieldsByBoard(boardId: string, tenantId: string): Promise<CardField[]> {
    const normalizedBoardId = normalizeUUID(boardId);
    const normalizedTenantId = normalizeUUID(tenantId);
    const result = await db
      .select()
      .from(cardFields)
      .where(and(eq(cardFields.boardId, normalizedBoardId), eq(cardFields.tenantId, normalizedTenantId)))
      .orderBy(asc(cardFields.position))
      .catch(() => [] as CardField[]);
    return normalizeRecords(result || []) as CardField[];
  },

  async updateCardField(id: string, tenantId: string, data: Partial<InsertCardField>): Promise<CardField | undefined> {
    const normalizedId = normalizeUUID(id) || id;
    const normalizedTenantId = normalizeUUID(tenantId) || tenantId;
    // Normalize UUID fields in update payload
    const normalizedData = {
      ...data,
      tenantId: normalizeUUID(data.tenantId),
      boardId: normalizeUUID(data.boardId),
      updatedAt: new Date()
    };
    const [field] = await db
      .update(cardFields)
      .set(normalizedData)
      .where(and(eq(cardFields.id, normalizedId), eq(cardFields.tenantId, normalizedTenantId)))
      .returning();
    return field ? normalizeRecord(field) as CardField : undefined;
  },

  async deleteCardField(id: string, tenantId: string): Promise<boolean> {
    const normalizedId = normalizeUUID(id);
    const normalizedTenantId = normalizeUUID(tenantId);
    await db.delete(cardFields).where(and(eq(cardFields.id, normalizedId), eq(cardFields.tenantId, normalizedTenantId)));
    return true;
  },

  // ========== CARD FIELD VALUES ==========
  async setCardFieldValue(data: InsertCardFieldValue): Promise<CardFieldValue> {
    const normalizedCardId = normalizeUUID(data.cardId);
    const normalizedFieldId = normalizeUUID(data.fieldId);
    const normalizedTenantId = normalizeUUID(data.tenantId);
    const normalizedData = { ...data, cardId: normalizedCardId, fieldId: normalizedFieldId, tenantId: normalizedTenantId };
    
    const existing = await db
      .select()
      .from(cardFieldValues)
      .where(
        and(
          eq(cardFieldValues.cardId, normalizedCardId),
          eq(cardFieldValues.fieldId, normalizedFieldId),
          eq(cardFieldValues.tenantId, normalizedTenantId)
        )
      );

    if (existing.length > 0) {
      const [updated] = await db
        .update(cardFieldValues)
        .set({ value: data.value, jsonValue: data.jsonValue, updatedAt: new Date() })
        .where(eq(cardFieldValues.id, normalizeUUID(existing[0].id)))
        .returning();
      return normalizeRecord(updated) as CardFieldValue;
    }

    const [created] = await db.insert(cardFieldValues).values(normalizedData).returning();
    return normalizeRecord(created) as CardFieldValue;
  },

  async getCardFieldValues(cardId: string, tenantId: string): Promise<CardFieldValue[]> {
    const normalizedCardId = normalizeUUID(cardId);
    const normalizedTenantId = normalizeUUID(tenantId);
    const result = await db
      .select()
      .from(cardFieldValues)
      .where(and(eq(cardFieldValues.cardId, normalizedCardId), eq(cardFieldValues.tenantId, normalizedTenantId)))
      .catch(() => [] as CardFieldValue[]);
    return normalizeRecords(result || []) as CardFieldValue[];
  },

  // ========== CARD COMMENTS ==========
  async createComment(data: InsertCardComment): Promise<CardComment> {
    const normalizedCardId = normalizeUUID(data.cardId);
    const normalizedUserId = normalizeUUID(data.userId);
    const normalizedTenantId = normalizeUUID(data.tenantId);
    const normalizedData = { ...data, cardId: normalizedCardId, userId: normalizedUserId, tenantId: normalizedTenantId };
    
    const [comment] = await db.insert(cardComments).values(normalizedData).returning();
    return normalizeRecord(comment) as CardComment;
  },

  async getCommentsByCard(cardId: string, tenantId: string): Promise<(CardComment & { user?: { name: string | null; image: string | null } })[]> {
    const normalizedCardId = normalizeUUID(cardId);
    const normalizedTenantId = normalizeUUID(tenantId);
    
    const comments = await db
      .select()
      .from(cardComments)
      .where(and(eq(cardComments.cardId, normalizedCardId), eq(cardComments.tenantId, normalizedTenantId)))
      .orderBy(desc(cardComments.createdAt))
      .catch(() => [] as CardComment[]);

    if (!comments || comments.length === 0) return [];

    const userIds = Array.from(new Set(comments.map((c: CardComment) => normalizeUUID(c.userId))));
    const usersData = userIds.length > 0
      ? await db.select({ id: users.id, name: users.name, image: users.image }).from(users).where(inArray(users.id, userIds)).catch(() => [])
      : [];

    const userMap = new Map((usersData || []).map((u: { id: string; name: string | null; image: string | null }) => [normalizeUUID(u.id), u]));

    return normalizeRecords(comments).map((c: CardComment) => ({
      ...c,
      user: userMap.get(normalizeUUID(c.userId)) || undefined
    }));
  },

  async updateComment(id: string, tenantId: string, content: string): Promise<CardComment | undefined> {
    const normalizedId = normalizeUUID(id);
    const normalizedTenantId = normalizeUUID(tenantId);
    const [comment] = await db
      .update(cardComments)
      .set({ content, isEdited: "true", updatedAt: new Date() })
      .where(and(eq(cardComments.id, normalizedId), eq(cardComments.tenantId, normalizedTenantId)))
      .returning();
    return comment ? normalizeRecord(comment) as CardComment : undefined;
  },

  async deleteComment(id: string, tenantId: string): Promise<boolean> {
    const normalizedId = normalizeUUID(id);
    const normalizedTenantId = normalizeUUID(tenantId);
    await db.delete(cardComments).where(and(eq(cardComments.id, normalizedId), eq(cardComments.tenantId, normalizedTenantId)));
    return true;
  },

  // ========== CARD ATTACHMENTS ==========
  async createAttachment(data: InsertCardAttachment): Promise<CardAttachment> {
    const normalizedCardId = normalizeUUID(data.cardId);
    const normalizedTenantId = normalizeUUID(data.tenantId);
    const normalizedUploadedBy = data.uploadedBy ? normalizeUUID(data.uploadedBy) : null;
    const normalizedData = { ...data, cardId: normalizedCardId, tenantId: normalizedTenantId, uploadedBy: normalizedUploadedBy };
    
    const [attachment] = await db.insert(cardAttachments).values(normalizedData).returning();
    return normalizeRecord(attachment) as CardAttachment;
  },

  async getAttachmentsByCard(cardId: string, tenantId: string): Promise<CardAttachment[]> {
    const normalizedCardId = normalizeUUID(cardId);
    const normalizedTenantId = normalizeUUID(tenantId);
    const result = await db
      .select()
      .from(cardAttachments)
      .where(and(eq(cardAttachments.cardId, normalizedCardId), eq(cardAttachments.tenantId, normalizedTenantId)))
      .orderBy(desc(cardAttachments.createdAt))
      .catch(() => [] as CardAttachment[]);
    return normalizeRecords(result || []) as CardAttachment[];
  },

  async deleteAttachment(id: string, tenantId: string): Promise<CardAttachment | undefined> {
    const normalizedId = normalizeUUID(id);
    const normalizedTenantId = normalizeUUID(tenantId);
    const [attachment] = await db
      .delete(cardAttachments)
      .where(and(eq(cardAttachments.id, normalizedId), eq(cardAttachments.tenantId, normalizedTenantId)))
      .returning();
    return attachment ? normalizeRecord(attachment) as CardAttachment : undefined;
  },

  // ========== ACTIVITY LOG ==========
  async logActivity(data: InsertCardActivityLog): Promise<CardActivityLog> {
    const normalizedCardId = normalizeUUID(data.cardId);
    const normalizedTenantId = normalizeUUID(data.tenantId);
    const normalizedUserId = data.userId ? normalizeUUID(data.userId) : null;
    const normalizedData = { ...data, cardId: normalizedCardId, tenantId: normalizedTenantId, userId: normalizedUserId };
    
    const [log] = await db.insert(cardActivityLogs).values(normalizedData).returning();
    return normalizeRecord(log) as CardActivityLog;
  },

  async getActivityByCard(cardId: string, tenantId: string): Promise<(CardActivityLog & { user?: { name: string | null; image: string | null } })[]> {
    const normalizedCardId = normalizeUUID(cardId);
    const normalizedTenantId = normalizeUUID(tenantId);
    
    const logs = await db
      .select()
      .from(cardActivityLogs)
      .where(and(eq(cardActivityLogs.cardId, normalizedCardId), eq(cardActivityLogs.tenantId, normalizedTenantId)))
      .orderBy(desc(cardActivityLogs.createdAt))
      .catch(() => [] as CardActivityLog[]);

    if (!logs || logs.length === 0) return [];

    const userIds = Array.from(new Set(logs.filter((l: CardActivityLog) => l.userId).map((l: CardActivityLog) => normalizeUUID(l.userId!))));
    const usersData = userIds.length > 0
      ? await db.select({ id: users.id, name: users.name, image: users.image }).from(users).where(inArray(users.id, userIds)).catch(() => [])
      : [];

    const userMap = new Map((usersData || []).map((u: { id: string; name: string | null; image: string | null }) => [normalizeUUID(u.id), u]));

    return normalizeRecords(logs).map((l: CardActivityLog) => ({
      ...l,
      user: l.userId ? userMap.get(normalizeUUID(l.userId)) : undefined
    }));
  },

  // ========== AUTOMATIONS ==========
  async createAutomation(data: InsertAutomation): Promise<Automation> {
    const normalizedBoardId = normalizeUUID(data.boardId);
    const normalizedTenantId = normalizeUUID(data.tenantId);
    const normalizedCreatedBy = data.createdBy ? normalizeUUID(data.createdBy) : null;
    const normalizedData = { ...data, boardId: normalizedBoardId, tenantId: normalizedTenantId, createdBy: normalizedCreatedBy };
    
    const [automation] = await db.insert(automations).values(normalizedData).returning();
    return normalizeRecord(automation) as Automation;
  },

  async getAutomationsByBoard(boardId: string, tenantId: string): Promise<Automation[]> {
    const normalizedBoardId = normalizeUUID(boardId);
    const normalizedTenantId = normalizeUUID(tenantId);
    const result = await db
      .select()
      .from(automations)
      .where(and(eq(automations.boardId, normalizedBoardId), eq(automations.tenantId, normalizedTenantId)))
      .orderBy(desc(automations.createdAt));
    return normalizeRecords(result) as Automation[];
  },

  async getAutomationById(id: string, tenantId: string): Promise<Automation | undefined> {
    const normalizedId = normalizeUUID(id);
    const normalizedTenantId = normalizeUUID(tenantId);
    const [automation] = await db
      .select()
      .from(automations)
      .where(and(eq(automations.id, normalizedId), eq(automations.tenantId, normalizedTenantId)));
    return automation ? normalizeRecord(automation) as Automation : undefined;
  },

  async updateAutomation(id: string, tenantId: string, data: Partial<InsertAutomation>): Promise<Automation | undefined> {
    const normalizedId = normalizeUUID(id) || id;
    const normalizedTenantId = normalizeUUID(tenantId) || tenantId;
    // Normalize UUID fields in update payload
    const normalizedData = {
      ...data,
      tenantId: normalizeUUID(data.tenantId),
      boardId: normalizeUUID(data.boardId),
      createdBy: normalizeUUID(data.createdBy),
      updatedAt: new Date()
    };
    const [automation] = await db
      .update(automations)
      .set(normalizedData)
      .where(and(eq(automations.id, normalizedId), eq(automations.tenantId, normalizedTenantId)))
      .returning();
    return automation ? normalizeRecord(automation) as Automation : undefined;
  },

  async deleteAutomation(id: string, tenantId: string): Promise<boolean> {
    const normalizedId = normalizeUUID(id);
    const normalizedTenantId = normalizeUUID(tenantId);
    await db.delete(automationTriggers).where(and(eq(automationTriggers.automationId, normalizedId), eq(automationTriggers.tenantId, normalizedTenantId)));
    await db.delete(automationActions).where(and(eq(automationActions.automationId, normalizedId), eq(automationActions.tenantId, normalizedTenantId)));
    await db.delete(automations).where(and(eq(automations.id, normalizedId), eq(automations.tenantId, normalizedTenantId)));
    return true;
  },

  // ========== AUTOMATION TRIGGERS ==========
  async createAutomationTrigger(data: InsertAutomationTrigger): Promise<AutomationTrigger> {
    const normalizedAutomationId = normalizeUUID(data.automationId);
    const normalizedTenantId = normalizeUUID(data.tenantId);
    const normalizedData = { ...data, automationId: normalizedAutomationId, tenantId: normalizedTenantId };
    
    const [trigger] = await db.insert(automationTriggers).values(normalizedData).returning();
    return normalizeRecord(trigger) as AutomationTrigger;
  },

  async getTriggersByAutomation(automationId: string, tenantId: string): Promise<AutomationTrigger[]> {
    const normalizedAutomationId = normalizeUUID(automationId);
    const normalizedTenantId = normalizeUUID(tenantId);
    const result = await db
      .select()
      .from(automationTriggers)
      .where(and(eq(automationTriggers.automationId, normalizedAutomationId), eq(automationTriggers.tenantId, normalizedTenantId)));
    return normalizeRecords(result) as AutomationTrigger[];
  },

  async getActiveAutomationsByTriggerType(boardId: string, tenantId: string, triggerType: string): Promise<(Automation & { triggers: AutomationTrigger[]; actions: AutomationAction[] })[]> {
    const normalizedBoardId = normalizeUUID(boardId);
    const normalizedTenantId = normalizeUUID(tenantId);
    
    const activeAutomations = await db
      .select()
      .from(automations)
      .where(
        and(
          eq(automations.boardId, normalizedBoardId),
          eq(automations.tenantId, normalizedTenantId),
          eq(automations.isActive, "true")
        )
      );

    const result: (Automation & { triggers: AutomationTrigger[]; actions: AutomationAction[] })[] = [];

    for (const automation of normalizeRecords(activeAutomations)) {
      const normalizedAutomationId = normalizeUUID(automation.id);
      const triggers = await db
        .select()
        .from(automationTriggers)
        .where(
          and(
            eq(automationTriggers.automationId, normalizedAutomationId),
            eq(automationTriggers.triggerType, triggerType)
          )
        );

      if (triggers.length > 0) {
        const actions = await db
          .select()
          .from(automationActions)
          .where(eq(automationActions.automationId, normalizedAutomationId))
          .orderBy(asc(automationActions.position));

        result.push({ ...automation, triggers: normalizeRecords(triggers), actions: normalizeRecords(actions) });
      }
    }

    return result;
  },

  // ========== AUTOMATION ACTIONS ==========
  async createAutomationAction(data: InsertAutomationAction): Promise<AutomationAction> {
    const normalizedAutomationId = normalizeUUID(data.automationId);
    const normalizedTenantId = normalizeUUID(data.tenantId);
    const normalizedData = { ...data, automationId: normalizedAutomationId, tenantId: normalizedTenantId };
    
    const maxPosition = await db
      .select({ max: sql<number>`COALESCE(MAX(position), -1)` })
      .from(automationActions)
      .where(eq(automationActions.automationId, normalizedAutomationId));
    
    const [action] = await db
      .insert(automationActions)
      .values({ ...normalizedData, position: (maxPosition[0]?.max ?? -1) + 1 })
      .returning();
    return normalizeRecord(action) as AutomationAction;
  },

  async getActionsByAutomation(automationId: string, tenantId: string): Promise<AutomationAction[]> {
    const normalizedAutomationId = normalizeUUID(automationId);
    const normalizedTenantId = normalizeUUID(tenantId);
    const result = await db
      .select()
      .from(automationActions)
      .where(and(eq(automationActions.automationId, normalizedAutomationId), eq(automationActions.tenantId, normalizedTenantId)))
      .orderBy(asc(automationActions.position));
    return normalizeRecords(result) as AutomationAction[];
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
