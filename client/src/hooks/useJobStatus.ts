import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useCallback } from "react";

export type JobStatus = "pending" | "running" | "completed" | "failed";

export interface Job {
  id: string;
  tenantId: string;
  userId: string;
  agentType: string;
  payload: Record<string, any>;
  status: JobStatus;
  output: Record<string, any> | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

interface UseJobStatusOptions {
  pollingInterval?: number;
  enabled?: boolean;
  onCompleted?: (job: Job) => void;
  onFailed?: (job: Job) => void;
}

export function useJobStatus(jobId: string | null, options: UseJobStatusOptions = {}) {
  const {
    pollingInterval = 2000,
    enabled = true,
    onCompleted,
    onFailed,
  } = options;

  const queryClient = useQueryClient();

  const query = useQuery<Job>({
    queryKey: ["job", jobId],
    queryFn: async () => {
      if (!jobId) throw new Error("No job ID provided");
      const res = await fetch(`/api/jobs/${jobId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch job status");
      }
      return res.json();
    },
    enabled: enabled && !!jobId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === "completed" || data?.status === "failed") {
        return false;
      }
      return pollingInterval;
    },
  });

  useEffect(() => {
    if (query.data?.status === "completed" && onCompleted) {
      onCompleted(query.data);
    }
    if (query.data?.status === "failed" && onFailed) {
      onFailed(query.data);
    }
  }, [query.data?.status, onCompleted, onFailed]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["job", jobId] });
  }, [queryClient, jobId]);

  return {
    job: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    status: query.data?.status ?? null,
    isCompleted: query.data?.status === "completed",
    isFailed: query.data?.status === "failed",
    isRunning: query.data?.status === "running",
    isPending: query.data?.status === "pending",
    invalidate,
    refetch: query.refetch,
  };
}

export async function triggerAgentJob(
  agentType: "generate" | "normalize" | "assign",
  payload: {
    demandId: string;
    prompt?: string;
    workflowId?: string;
  }
): Promise<{ jobId: string; eventId: string }> {
  const endpoint = `/api/agents/workflow/${agentType}`;
  
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || "Failed to trigger agent job");
  }

  return res.json();
}

export function useAgentJob(agentType: "generate" | "normalize" | "assign") {
  const queryClient = useQueryClient();

  const trigger = useCallback(async (payload: {
    demandId: string;
    prompt?: string;
    workflowId?: string;
  }) => {
    const result = await triggerAgentJob(agentType, payload);
    queryClient.invalidateQueries({ queryKey: ["jobs"] });
    return result;
  }, [agentType, queryClient]);

  return { trigger };
}
