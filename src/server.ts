// src/server.ts
import express from "express";
import dotenv from "dotenv";
import path from "path";
import telexRoutes from "./routes/telexRoutes";
import { log } from "./utils/logger";
import mastra, { certificateAgent } from "./mastra-agent";
import a2aEndpoint from "./routes/a2a-endpoint";

dotenv.config();

const app = express();
app.use(express.json());

// Serve generated certificates publicly
app.use("/certificates", express.static(path.resolve("./certificates")));

// Normal telex/manual route(s)
app.use("/telex", telexRoutes);
app.use("/", a2aEndpoint);
// Mastra init log
if (mastra) {
  log("🤖 Mastra certificate agent initialized successfully");
} else {
  log("⚠️ Mastra agent failed to initialize");
}

// A2A endpoint (Telex validator expects this)
app.post("/a2a-endpoint", async (req, res) => {
  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ error: "Missing 'input' field" });

    let inputData;
    try {
      inputData = typeof input === "string" ? JSON.parse(input) : input;
    } catch {
      return res.status(400).json({ error: "Invalid JSON in 'input' field' " });
    }

    // Execute Mastra agent (wrap in { input })
    const result = await certificateAgent.execute({ input: inputData });

    // Try to read public file url from agent output
    const fileUrl = result?.output?.fileUrl || null;
    const downloadUrl = fileUrl ? fileUrl : `/certificates/${path.basename(result?.output?.filePath || "certificate.pdf")}`;

    return res.json({
      output: result?.output?.message || "Certificate generated",
      status: "success",
      download_url: downloadUrl,
    });
  } catch (err: any) {
    log(`⚠️ Error in A2A endpoint: ${err?.message || err}`);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// health
app.get("/", (_req, res) => res.send("✅ Telex Certificate Agent is live"));

// start
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => log(`✅ Server running on port ${PORT}`));
