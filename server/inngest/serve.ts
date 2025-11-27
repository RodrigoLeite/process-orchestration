import { serve } from "inngest/express";
import { inngest } from "./client";
import { functions } from "./functions";

export const inngestServe = serve({
  client: inngest,
  functions,
});
