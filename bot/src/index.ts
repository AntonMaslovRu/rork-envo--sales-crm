import { serve } from "@hono/node-server";
import { config } from "./config.js";
import { app } from "./api.js";
import { startPoller } from "./poller.js";

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`[API] Админка и API на http://localhost:${info.port}`);
});

startPoller();
