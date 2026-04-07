import express from "express";
import { createEmailProcessingOrchestrator } from "./workflow";
import type { EmailProvider, UserContext } from "./types";

const app = express();
const orchestrator = createEmailProcessingOrchestrator({ pollLimit: 10 });

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok hello 123" });
});

app.post("/workflow/run-once", async (req, res) => {
  try {
    const provider = req.body?.provider === "outlook" ? "outlook" : "gmail";
    const userContext: UserContext = {
      userId: req.body?.userId ?? "demo-user",
      workspaceId: req.body?.workspaceId ?? "demo-workspace",
      provider: provider as EmailProvider,
    };

    const results = await orchestrator.processNextBatch(userContext);

    res.json({
      ok: true,
      count: results.length,
      results,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
