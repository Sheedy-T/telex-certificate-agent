// server.ts
import express from "express";
import dotenv from "dotenv";
import path from "path";
import telexRoutes from "./routes/telexRoutes";
import { log } from "./utils/logger";
import mastra, { certificateAgent } from "./mastra-agent"; // Import agent

dotenv.config();

const app = express();

// ✅ Middleware
app.use(express.json());

// ✅ Serve certificate files publicly
app.use("/certificates", express.static(path.resolve("./certificates")));

// ✅ Load your existing Telex routes
app.use("/telex", telexRoutes);

// ✅ Initialize Mastra agent
if (mastra) {
  log("🤖 Mastra certificate agent initialized successfully");
} else {
  log("⚠️ Mastra agent failed to initialize");
}

// ✅ A2A endpoint
app.post("/a2a-endpoint", async (req, res) => {
  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ error: "Missing 'input' field" });

    // Parse input JSON for agent
    let inputData;
    try {
      inputData = typeof input === "string" ? JSON.parse(input) : input;
    } catch (err) {
      return res.status(400).json({ error: "Invalid JSON in 'input' field" });
    }

    // Execute agent
    const result = await certificateAgent.execute(inputData);

    // Respond in A2A validator-friendly format
    res.json({
      output: result.output || result.output,
      status: "success",
      download_url: `/certificates/${path.basename(result.filePath)}`,
    });
  } catch (err) {
    log(`⚠️ Error in A2A endpoint: ${err}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => log(`✅ Server running on port ${PORT}`));
