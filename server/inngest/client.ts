import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "process-orchestration",
  eventKey: process.env.INNGEST_EVENT_KEY,
});

export type AgentEventPayload = {
  tenantId: string;
  userId: string;
  demandId: string;
  prompt: string;
  jobId: string;
};

export type AgentEvents = {
  "agent/generate.workflow": { data: AgentEventPayload };
  "agent/normalize.workflow": { data: AgentEventPayload };
  "agent/assign.workflow": { data: AgentEventPayload };
};
