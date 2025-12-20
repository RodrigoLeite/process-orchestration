import { Router, Request, Response } from "express";
import { z } from "zod";
import { kanbanStorage } from "../kanban/storage";
import {
  insertBoardSchema,
  insertPhaseSchema,
  insertCardSchema,
  insertCardFieldSchema,
  insertCardCommentSchema,
  insertAutomationSchema,
} from "@shared/schema";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { normalizeUUID, normalizeRecord, normalizeRecords } from "../lib/uuidUtils";

const router = Router();

const getTenantId = (req: Request): string => {
  const headerTenantId = req.headers['x-tenant-id'] as string | undefined;
  const tenantContext = (req as any).tenantContext;
  const rawId = headerTenantId || tenantContext?.id || "";
  return normalizeUUID(rawId) || "";
};

const getUserId = (req: Request): string => {
  const user = (req as any).user;
  const rawId = user?.sub || user?.id || "";
  return normalizeUUID(rawId) || "";
};

// ========== BOARDS ==========

router.get("/boards", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(401).json({ error: "Tenant not found" });
    }
    const boards = await kanbanStorage.getBoardsByTenant(tenantId);
    res.json(normalizeRecords(boards));
  } catch (error) {
    console.error("Error fetching boards:", error);
    res.status(500).json({ error: "Failed to fetch boards" });
  }
});

router.get("/boards/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const boardId = normalizeUUID(req.params.id);
    const data = await kanbanStorage.getFullBoard(boardId, tenantId);
    if (!data) {
      return res.status(404).json({ error: "Board not found" });
    }
    const normalizedData = {
      board: normalizeRecord(data.board),
      phases: normalizeRecords(data.phases || []),
      cards: normalizeRecords(data.cards || []),
      fields: normalizeRecords(data.fields || [])
    };
    res.json(normalizedData);
  } catch (error) {
    console.error("Error fetching board:", error);
    res.status(500).json({ error: "Failed to fetch board" });
  }
});

router.post("/boards", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const data = insertBoardSchema.parse({ ...req.body, tenantId, createdBy: userId });
    const board = await kanbanStorage.createBoard(data);
    
    await kanbanStorage.logActivity({
      tenantId,
      cardId: board.id,
      userId,
      action: "board_created",
      metadata: { boardName: board.name },
    });
    
    res.status(201).json(board);
  } catch (error) {
    console.error("Error creating board:", error);
    res.status(500).json({ error: "Failed to create board" });
  }
});

router.put("/boards/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const board = await kanbanStorage.updateBoard(id, tenantId, req.body);
    if (!board) {
      return res.status(404).json({ error: "Board not found" });
    }
    res.json(board);
  } catch (error) {
    console.error("Error updating board:", error);
    res.status(500).json({ error: "Failed to update board" });
  }
});

router.delete("/boards/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    await kanbanStorage.deleteBoard(id, tenantId);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting board:", error);
    res.status(500).json({ error: "Failed to delete board" });
  }
});

// ========== PHASES ==========

router.get("/boards/:boardId/phases", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { boardId } = req.params;
    const phases = await kanbanStorage.getPhasesByBoard(boardId, tenantId);
    res.json(phases);
  } catch (error) {
    console.error("Error fetching phases:", error);
    res.status(500).json({ error: "Failed to fetch phases" });
  }
});

router.post("/boards/:boardId/phases", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { boardId } = req.params;
    const data = insertPhaseSchema.parse({ ...req.body, tenantId, boardId });
    const phase = await kanbanStorage.createPhase(data);
    res.status(201).json(phase);
  } catch (error) {
    console.error("Error creating phase:", error);
    res.status(500).json({ error: "Failed to create phase" });
  }
});

router.put("/phases/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const phase = await kanbanStorage.updatePhase(id, tenantId, req.body);
    if (!phase) {
      return res.status(404).json({ error: "Phase not found" });
    }
    res.json(phase);
  } catch (error) {
    console.error("Error updating phase:", error);
    res.status(500).json({ error: "Failed to update phase" });
  }
});

router.delete("/phases/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    await kanbanStorage.deletePhase(id, tenantId);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting phase:", error);
    res.status(500).json({ error: "Failed to delete phase" });
  }
});

router.post("/boards/:boardId/phases/reorder", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { boardId } = req.params;
    const { phaseIds } = req.body;
    await kanbanStorage.reorderPhases(boardId, tenantId, phaseIds);
    res.json({ success: true });
  } catch (error) {
    console.error("Error reordering phases:", error);
    res.status(500).json({ error: "Failed to reorder phases" });
  }
});

// ========== CARDS ==========

router.get("/boards/:boardId/cards", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { boardId } = req.params;
    const cards = await kanbanStorage.getCardsByBoard(boardId, tenantId);
    res.json(cards);
  } catch (error) {
    console.error("Error fetching cards:", error);
    res.status(500).json({ error: "Failed to fetch cards" });
  }
});

router.get("/cards/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const data = await kanbanStorage.getCardWithDetails(id, tenantId);
    if (!data) {
      return res.status(404).json({ error: "Card not found" });
    }
    res.json(data);
  } catch (error) {
    console.error("Error fetching card:", error);
    res.status(500).json({ error: "Failed to fetch card" });
  }
});

router.post("/boards/:boardId/cards", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const { boardId } = req.params;
    const data = insertCardSchema.parse({
      ...req.body,
      tenantId,
      boardId,
      createdBy: userId,
      reporterId: userId,
    });
    const card = await kanbanStorage.createCard(data);
    
    await kanbanStorage.logActivity({
      tenantId,
      cardId: card.id,
      userId,
      action: "card_created",
      metadata: { title: card.title },
    });
    
    res.status(201).json(card);
  } catch (error) {
    console.error("Error creating card:", error);
    res.status(500).json({ error: "Failed to create card" });
  }
});

router.put("/cards/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const { id } = req.params;
    
    const oldCard = await kanbanStorage.getCardById(id, tenantId);
    const card = await kanbanStorage.updateCard(id, tenantId, req.body);
    
    if (!card) {
      return res.status(404).json({ error: "Card not found" });
    }
    
    const changes: Record<string, { old: any; new: any }> = {};
    for (const key of Object.keys(req.body)) {
      if (oldCard && (oldCard as any)[key] !== req.body[key]) {
        changes[key] = { old: (oldCard as any)[key], new: req.body[key] };
      }
    }
    
    if (Object.keys(changes).length > 0) {
      await kanbanStorage.logActivity({
        tenantId,
        cardId: card.id,
        userId,
        action: "card_updated",
        oldValue: oldCard,
        newValue: card,
        metadata: { changes },
      });
    }
    
    res.json(card);
  } catch (error) {
    console.error("Error updating card:", error);
    res.status(500).json({ error: "Failed to update card" });
  }
});

router.delete("/cards/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    await kanbanStorage.deleteCard(id, tenantId);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting card:", error);
    res.status(500).json({ error: "Failed to delete card" });
  }
});

router.post("/cards/:id/move", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const { id } = req.params;
    const { phaseId, position } = req.body;
    
    const oldCard = await kanbanStorage.getCardById(id, tenantId);
    const card = await kanbanStorage.moveCard(id, tenantId, phaseId, position);
    
    if (!card) {
      return res.status(404).json({ error: "Card not found" });
    }
    
    if (oldCard && oldCard.phaseId !== phaseId) {
      const [oldPhase, newPhase] = await Promise.all([
        kanbanStorage.getPhaseById(oldCard.phaseId, tenantId),
        kanbanStorage.getPhaseById(phaseId, tenantId),
      ]);
      
      await kanbanStorage.logActivity({
        tenantId,
        cardId: card.id,
        userId,
        action: "card_moved",
        oldValue: { phaseId: oldCard.phaseId, phaseName: oldPhase?.name },
        newValue: { phaseId, phaseName: newPhase?.name },
      });
    }
    
    res.json(card);
  } catch (error) {
    console.error("Error moving card:", error);
    res.status(500).json({ error: "Failed to move card" });
  }
});

// ========== CARD FIELDS ==========

router.get("/boards/:boardId/fields", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { boardId } = req.params;
    const fields = await kanbanStorage.getCardFieldsByBoard(boardId, tenantId);
    res.json(fields);
  } catch (error) {
    console.error("Error fetching fields:", error);
    res.status(500).json({ error: "Failed to fetch fields" });
  }
});

router.post("/boards/:boardId/fields", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { boardId } = req.params;
    const data = insertCardFieldSchema.parse({ ...req.body, tenantId, boardId });
    const field = await kanbanStorage.createCardField(data);
    res.status(201).json(field);
  } catch (error) {
    console.error("Error creating field:", error);
    res.status(500).json({ error: "Failed to create field" });
  }
});

router.put("/fields/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const field = await kanbanStorage.updateCardField(id, tenantId, req.body);
    if (!field) {
      return res.status(404).json({ error: "Field not found" });
    }
    res.json(field);
  } catch (error) {
    console.error("Error updating field:", error);
    res.status(500).json({ error: "Failed to update field" });
  }
});

router.delete("/fields/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    await kanbanStorage.deleteCardField(id, tenantId);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting field:", error);
    res.status(500).json({ error: "Failed to delete field" });
  }
});

// ========== CARD FIELD VALUES ==========

router.get("/cards/:cardId/field-values", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { cardId } = req.params;
    const values = await kanbanStorage.getCardFieldValues(cardId, tenantId);
    res.json(values);
  } catch (error) {
    console.error("Error fetching field values:", error);
    res.status(500).json({ error: "Failed to fetch field values" });
  }
});

router.post("/cards/:cardId/field-values", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const { cardId } = req.params;
    const { fieldId, value, jsonValue } = req.body;
    
    const fieldValue = await kanbanStorage.setCardFieldValue({
      tenantId,
      cardId,
      fieldId,
      value,
      jsonValue,
    });
    
    await kanbanStorage.logActivity({
      tenantId,
      cardId,
      userId,
      action: "field_updated",
      entityType: "field",
      entityId: fieldId,
      newValue: { value, jsonValue },
    });
    
    res.json(fieldValue);
  } catch (error) {
    console.error("Error setting field value:", error);
    res.status(500).json({ error: "Failed to set field value" });
  }
});

// ========== COMMENTS ==========

router.get("/cards/:cardId/comments", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { cardId } = req.params;
    const comments = await kanbanStorage.getCommentsByCard(cardId, tenantId);
    res.json(comments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

router.post("/cards/:cardId/comments", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const { cardId } = req.params;
    const { content, parentId } = req.body;
    
    const comment = await kanbanStorage.createComment({
      tenantId,
      cardId,
      userId,
      content,
      parentId,
    });
    
    await kanbanStorage.logActivity({
      tenantId,
      cardId,
      userId,
      action: "comment_added",
      entityType: "comment",
      entityId: comment.id,
    });
    
    res.status(201).json(comment);
  } catch (error) {
    console.error("Error creating comment:", error);
    res.status(500).json({ error: "Failed to create comment" });
  }
});

router.put("/comments/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const { content } = req.body;
    const comment = await kanbanStorage.updateComment(id, tenantId, content);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }
    res.json(comment);
  } catch (error) {
    console.error("Error updating comment:", error);
    res.status(500).json({ error: "Failed to update comment" });
  }
});

router.delete("/comments/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    await kanbanStorage.deleteComment(id, tenantId);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ error: "Failed to delete comment" });
  }
});

// ========== ATTACHMENTS ==========

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

router.get("/cards/:cardId/attachments", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { cardId } = req.params;
    const attachments = await kanbanStorage.getAttachmentsByCard(cardId, tenantId);
    res.json(attachments);
  } catch (error) {
    console.error("Error fetching attachments:", error);
    res.status(500).json({ error: "Failed to fetch attachments" });
  }
});

router.post("/cards/:cardId/attachments", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const { cardId } = req.params;
    
    const chunks: Buffer[] = [];
    let filename = "";
    let mimeType = "application/octet-stream";
    
    const contentDisposition = req.headers["content-disposition"];
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?(.+)"?/);
      if (match) filename = match[1];
    }
    
    const contentType = req.headers["content-type"];
    if (contentType && !contentType.includes("multipart")) {
      mimeType = contentType;
    }
    
    if (!filename) {
      filename = `file_${Date.now()}`;
    }
    
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", async () => {
      try {
        const buffer = Buffer.concat(chunks);
        const uuid = randomUUID();
        const ext = path.extname(filename);
        const storedFilename = `${uuid}${ext}`;
        const filePath = path.join(UPLOAD_DIR, tenantId, cardId);
        
        if (!fs.existsSync(filePath)) {
          fs.mkdirSync(filePath, { recursive: true });
        }
        
        const fullPath = path.join(filePath, storedFilename);
        fs.writeFileSync(fullPath, buffer);
        
        const attachment = await kanbanStorage.createAttachment({
          tenantId,
          cardId,
          userId,
          filename: storedFilename,
          originalName: filename,
          mimeType,
          size: buffer.length,
          path: fullPath,
          url: `/api/kanban/uploads/${tenantId}/${cardId}/${storedFilename}`,
        });
        
        await kanbanStorage.logActivity({
          tenantId,
          cardId,
          userId,
          action: "attachment_added",
          entityType: "attachment",
          entityId: attachment.id,
          metadata: { filename },
        });
        
        res.status(201).json(attachment);
      } catch (err) {
        console.error("Error saving attachment:", err);
        res.status(500).json({ error: "Failed to save attachment" });
      }
    });
  } catch (error) {
    console.error("Error uploading attachment:", error);
    res.status(500).json({ error: "Failed to upload attachment" });
  }
});

router.get("/uploads/:tenantId/:cardId/:filename", (req: Request, res: Response) => {
  try {
    const { tenantId, cardId, filename } = req.params;
    const filePath = path.join(UPLOAD_DIR, tenantId, cardId, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }
    
    res.sendFile(filePath);
  } catch (error) {
    console.error("Error serving file:", error);
    res.status(500).json({ error: "Failed to serve file" });
  }
});

router.delete("/attachments/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const { id } = req.params;
    
    const attachment = await kanbanStorage.deleteAttachment(id, tenantId);
    
    if (attachment && fs.existsSync(attachment.path)) {
      fs.unlinkSync(attachment.path);
    }
    
    if (attachment) {
      await kanbanStorage.logActivity({
        tenantId,
        cardId: attachment.cardId,
        userId,
        action: "attachment_removed",
        entityType: "attachment",
        entityId: id,
      });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting attachment:", error);
    res.status(500).json({ error: "Failed to delete attachment" });
  }
});

// ========== ACTIVITY LOG ==========

router.get("/cards/:cardId/activity", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { cardId } = req.params;
    const activities = await kanbanStorage.getActivityByCard(cardId, tenantId);
    res.json(activities);
  } catch (error) {
    console.error("Error fetching activity:", error);
    res.status(500).json({ error: "Failed to fetch activity" });
  }
});

// ========== AUTOMATIONS ==========

router.get("/boards/:boardId/automations", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { boardId } = req.params;
    const automations = await kanbanStorage.getAutomationsByBoard(boardId, tenantId);
    res.json(automations);
  } catch (error) {
    console.error("Error fetching automations:", error);
    res.status(500).json({ error: "Failed to fetch automations" });
  }
});

router.post("/boards/:boardId/automations", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const userId = getUserId(req);
    const { boardId } = req.params;
    const data = insertAutomationSchema.parse({ ...req.body, tenantId, boardId, createdBy: userId });
    const automation = await kanbanStorage.createAutomation(data);
    res.status(201).json(automation);
  } catch (error) {
    console.error("Error creating automation:", error);
    res.status(500).json({ error: "Failed to create automation" });
  }
});

router.put("/automations/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const automation = await kanbanStorage.updateAutomation(id, tenantId, req.body);
    if (!automation) {
      return res.status(404).json({ error: "Automation not found" });
    }
    res.json(automation);
  } catch (error) {
    console.error("Error updating automation:", error);
    res.status(500).json({ error: "Failed to update automation" });
  }
});

router.delete("/automations/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    await kanbanStorage.deleteAutomation(id, tenantId);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting automation:", error);
    res.status(500).json({ error: "Failed to delete automation" });
  }
});

router.get("/automations/:id", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const automation = await kanbanStorage.getAutomationById(id, tenantId);
    
    if (!automation) {
      return res.status(404).json({ error: "Automation not found" });
    }
    
    const [triggers, actions] = await Promise.all([
      kanbanStorage.getTriggersByAutomation(id, tenantId),
      kanbanStorage.getActionsByAutomation(id, tenantId),
    ]);
    
    res.json({ ...automation, triggers, actions });
  } catch (error) {
    console.error("Error fetching automation:", error);
    res.status(500).json({ error: "Failed to fetch automation" });
  }
});

router.post("/automations/:id/triggers", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const trigger = await kanbanStorage.createAutomationTrigger({
      tenantId,
      automationId: id,
      ...req.body,
    });
    res.status(201).json(trigger);
  } catch (error) {
    console.error("Error creating trigger:", error);
    res.status(500).json({ error: "Failed to create trigger" });
  }
});

router.post("/automations/:id/actions", async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const action = await kanbanStorage.createAutomationAction({
      tenantId,
      automationId: id,
      ...req.body,
    });
    res.status(201).json(action);
  } catch (error) {
    console.error("Error creating action:", error);
    res.status(500).json({ error: "Failed to create action" });
  }
});

export default router;
