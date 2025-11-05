import { Router, Request, Response } from "express";
import { certificateAgent } from "../mastra-agent";

const router = Router();

// ✅ Handle POST requests from Telex
router.post("/execute", async (req: Request, res: Response) => {
  try {
    const { name, course, date } = req.body;

    if (!name || !course) {
      return res.status(400).json({
        ok: false,
        error: "Missing required fields: name and course",
      });
    }

    const result = await certificateAgent.execute({
      name,
      course,
      date: date || new Date().toISOString().split("T")[0],
    });

    return res.json({
      ok: true,
      result,
    });
  } catch (err: any) {
    console.error("❌ Error executing agent:", err);
    return res.status(500).json({
      ok: false,
      error: "Failed to process request",
      details: err.message,
    });
  }
});

// ✅ Add this GET route for easy testing / health check
router.get("/execute", (req: Request, res: Response) => {
  res.send("✅ Telex certificate agent is running. Use POST to execute.");
});

export default router;
