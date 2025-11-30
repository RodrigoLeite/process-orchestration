import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

export interface Board {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isArchived?: string;
  settings?: Record<string, any>;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Phase {
  id: string;
  tenantId: string;
  boardId: string;
  name: string;
  description?: string;
  color?: string;
  position: number;
  isInitial?: string;
  isFinal?: string;
  triggerAgent?: string;
  slaHours?: number;
  wipLimit?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Card {
  id: string;
  tenantId: string;
  boardId: string;
  phaseId: string;
  demandId?: string;
  workflowId?: string;
  title: string;
  description?: string;
  position: number;
  priority?: string;
  assigneeId?: string;
  reporterId?: string;
  deadline?: string;
  startedAt?: string;
  completedAt?: string;
  slaDeadline?: string;
  areaId?: string;
  labels?: string[];
  metadata?: Record<string, any>;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CardField {
  id: string;
  tenantId: string;
  boardId: string;
  name: string;
  key: string;
  fieldType: string;
  options?: {
    choices?: Array<{ value: string; label: string; color?: string }>;
    min?: number;
    max?: number;
    placeholder?: string;
    required?: boolean;
    currency?: string;
  };
  position: number;
  isRequired?: string;
  isVisible?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CardFieldValue {
  id: string;
  tenantId: string;
  cardId: string;
  fieldId: string;
  value?: string;
  jsonValue?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CardComment {
  id: string;
  tenantId: string;
  cardId: string;
  userId: string;
  content: string;
  parentId?: string;
  isEdited?: string;
  user?: { name: string | null; image: string | null };
  createdAt: string;
  updatedAt: string;
}

export interface CardAttachment {
  id: string;
  tenantId: string;
  cardId: string;
  userId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  url?: string;
  createdAt: string;
}

export interface CardActivityLog {
  id: string;
  tenantId: string;
  cardId: string;
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  oldValue?: any;
  newValue?: any;
  metadata?: Record<string, any>;
  user?: { name: string | null; image: string | null };
  createdAt: string;
}

export interface FullBoard {
  board: Board;
  phases: Phase[];
  cards: Card[];
  fields: CardField[];
}

export interface CardWithDetails {
  card: Card;
  phase?: Phase;
  board?: Board;
  fieldValues: CardFieldValue[];
  comments: CardComment[];
  attachments: CardAttachment[];
  activities: CardActivityLog[];
  assignee?: { id: string; name: string | null; image: string | null };
}

const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  if (res.status === 204) return null;
  return res.json();
};

// ========== BOARDS ==========

export function useBoards() {
  return useQuery<Board[]>({
    queryKey: ["kanban", "boards"],
    queryFn: () => fetchWithAuth("/api/kanban/boards"),
  });
}

export function useBoard(boardId: string | undefined) {
  return useQuery<FullBoard>({
    queryKey: ["kanban", "board", boardId],
    queryFn: () => fetchWithAuth(`/api/kanban/boards/${boardId}`),
    enabled: !!boardId,
  });
}

export function useCreateBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Board>) =>
      fetchWithAuth("/api/kanban/boards", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kanban", "boards"] });
    },
  });
}

export function useUpdateBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Board> & { id: string }) =>
      fetchWithAuth(`/api/kanban/boards/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["kanban", "boards"] });
      queryClient.invalidateQueries({ queryKey: ["kanban", "board", variables.id] });
    },
  });
}

export function useDeleteBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchWithAuth(`/api/kanban/boards/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kanban", "boards"] });
    },
  });
}

// ========== PHASES ==========

export function useCreatePhase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ boardId, ...data }: Partial<Phase> & { boardId: string }) =>
      fetchWithAuth(`/api/kanban/boards/${boardId}/phases`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["kanban", "board", variables.boardId] });
    },
  });
}

export function useUpdatePhase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, boardId, ...data }: Partial<Phase> & { id: string; boardId: string }) =>
      fetchWithAuth(`/api/kanban/phases/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["kanban", "board", variables.boardId] });
    },
  });
}

export function useDeletePhase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, boardId }: { id: string; boardId: string }) =>
      fetchWithAuth(`/api/kanban/phases/${id}`, { method: "DELETE" }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["kanban", "board", variables.boardId] });
    },
  });
}

export function useReorderPhases() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ boardId, phaseIds }: { boardId: string; phaseIds: string[] }) =>
      fetchWithAuth(`/api/kanban/boards/${boardId}/phases/reorder`, {
        method: "POST",
        body: JSON.stringify({ phaseIds }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["kanban", "board", variables.boardId] });
    },
  });
}

// ========== CARDS ==========

export function useCard(cardId: string | undefined) {
  return useQuery<CardWithDetails>({
    queryKey: ["kanban", "card", cardId],
    queryFn: () => fetchWithAuth(`/api/kanban/cards/${cardId}`),
    enabled: !!cardId,
  });
}

export function useCreateCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ boardId, ...data }: Partial<Card> & { boardId: string }) =>
      fetchWithAuth(`/api/kanban/boards/${boardId}/cards`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["kanban", "board", variables.boardId] });
    },
  });
}

export function useUpdateCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, boardId, ...data }: Partial<Card> & { id: string; boardId: string }) =>
      fetchWithAuth(`/api/kanban/cards/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["kanban", "board", variables.boardId] });
      queryClient.invalidateQueries({ queryKey: ["kanban", "card", variables.id] });
    },
  });
}

export function useDeleteCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, boardId }: { id: string; boardId: string }) =>
      fetchWithAuth(`/api/kanban/cards/${id}`, { method: "DELETE" }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["kanban", "board", variables.boardId] });
    },
  });
}

export function useMoveCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, boardId, phaseId, position }: { id: string; boardId: string; phaseId: string; position: number }) =>
      fetchWithAuth(`/api/kanban/cards/${id}/move`, {
        method: "POST",
        body: JSON.stringify({ phaseId, position }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["kanban", "board", variables.boardId] });
    },
  });
}

// ========== CARD FIELD VALUES ==========

export function useSetFieldValue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cardId, fieldId, value, jsonValue }: { cardId: string; fieldId: string; value?: string; jsonValue?: any }) =>
      fetchWithAuth(`/api/kanban/cards/${cardId}/field-values`, {
        method: "POST",
        body: JSON.stringify({ fieldId, value, jsonValue }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["kanban", "card", variables.cardId] });
    },
  });
}

// ========== COMMENTS ==========

export function useCreateComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cardId, content, parentId }: { cardId: string; content: string; parentId?: string }) =>
      fetchWithAuth(`/api/kanban/cards/${cardId}/comments`, {
        method: "POST",
        body: JSON.stringify({ content, parentId }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["kanban", "card", variables.cardId] });
    },
  });
}

export function useUpdateComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, cardId, content }: { id: string; cardId: string; content: string }) =>
      fetchWithAuth(`/api/kanban/comments/${id}`, {
        method: "PUT",
        body: JSON.stringify({ content }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["kanban", "card", variables.cardId] });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, cardId }: { id: string; cardId: string }) =>
      fetchWithAuth(`/api/kanban/comments/${id}`, { method: "DELETE" }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["kanban", "card", variables.cardId] });
    },
  });
}

// ========== ATTACHMENTS ==========

export function useUploadAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ cardId, file }: { cardId: string; file: File }) => {
      const res = await fetch(`/api/kanban/cards/${cardId}/attachments`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": file.type,
          "Content-Disposition": `attachment; filename="${file.name}"`,
        },
        body: file,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["kanban", "card", variables.cardId] });
    },
  });
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, cardId }: { id: string; cardId: string }) =>
      fetchWithAuth(`/api/kanban/attachments/${id}`, { method: "DELETE" }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["kanban", "card", variables.cardId] });
    },
  });
}

// ========== CUSTOM FIELDS ==========

export function useCreateField() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ boardId, ...data }: Partial<CardField> & { boardId: string }) =>
      fetchWithAuth(`/api/kanban/boards/${boardId}/fields`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["kanban", "board", variables.boardId] });
    },
  });
}

export function useUpdateField() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, boardId, ...data }: Partial<CardField> & { id: string; boardId: string }) =>
      fetchWithAuth(`/api/kanban/fields/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["kanban", "board", variables.boardId] });
    },
  });
}

export function useDeleteField() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, boardId }: { id: string; boardId: string }) =>
      fetchWithAuth(`/api/kanban/fields/${id}`, { method: "DELETE" }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["kanban", "board", variables.boardId] });
    },
  });
}
