import { Router, Request, Response } from "express";
import { certificateAgent } from "../mastra-agent";

const router = Router();

// ✅ Handle POST requests from Telex or local testing
router.post("/execute", async (req: Request, res: Response) => {
  try {
    console.log("📥 Incoming request:", req.body);

    const { type, data } = req.body;

    // ✅ Handle Telex A2A standard payloads
    if (type && type.startsWith("a2a/")) {
      const { name, course, date } = data || {};

      if (!name || !course) {
        return res.status(400).json({
          ok: false,
          error: "Missing required fields in A2A data: name, course",
        });
      }

      // ✅ FIXED: Wrap fields inside `input` for Mastra agent
      const result = await certificateAgent.execute({
        input: {
          name,
          course,
          date: date || new Date().toISOString().split("T")[0],
        },
      });

      return res.json({
        ok: true,
        type,
        data: {
          message: `Certificate generated for ${name}`,
          download_url: `/certificates/${name.replace(/\s+/g, "_")}_certificate.pdf`,
          result,
        },
      });
    }

    // ✅ Fallback for manual/local testing with JSON
    const { name, course, date } = req.body;
    if (!name || !course) {
      return res.status(400).json({
        ok: false,
        error: "Missing required fields: name and course",
      });
    }

    // ✅ FIXED: Wrap fields inside `input`
    const result = await certificateAgent.execute({
      input: {
        name,
        course,
        date: date || new Date().toISOString().split("T")[0],
      },
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

// ✅ Add this GET route for quick health checks
router.get("/execute", (req: Request, res: Response) => {
  res.send("✅ Telex certificate agent is running. Use POST to execute.");
});

export default router;
