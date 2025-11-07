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
app.use("/", a2aEndpoint); // This includes the refactored /a2a-endpoint from a2a-endpoint.ts

// Mastra init log
if (mastra) {
  log("🤖 Mastra certificate agent initialized successfully");
} else {
  log("⚠️ Mastra agent failed to initialize");
}

// A2A endpoint (Telex validator expects this) - Use a different path or remove if a2a-endpoint.ts is intended to be the primary handler
// Since both files define /a2a-endpoint, I will assume the one in `server.ts` is the fallback/Mastra one.
app.post("/a2a-endpoint-mastra", async (req, res) => { // Renamed for clarity to avoid conflict
  try {
    const { input } = req.body;
    if (!input) return res.status(400).json({ error: "Missing 'input' field" });

    let inputData: any;
    try {
      // The Mastra agent in mastra-agent.ts expects a JSON object of {name, course, date}
      // The input from the user (e.g., in the chat screenshot) is a string, which is typically parsed by the router, 
      // but here we try to parse it as JSON for the agent execution.
      inputData = typeof input === "string" ? JSON.parse(input) : input;
    } catch {
      // If JSON parsing fails, attempt to parse the string fields like a2a-endpoint.ts
      const regex = /(\w+)=["']([^"']+)["']/g;
      const fields: any = {};
      let match;
      let rawInput = typeof input === 'string' ? input : JSON.stringify(input);
      while ((match = regex.exec(rawInput))) {
          fields[match[1]] = match[2];
      }
      inputData = fields;
      if (!inputData.name || !inputData.course) {
          return res.status(400).json({ error: "Invalid input format or missing fields in 'input' field" });
      }
    }

    // Execute Mastra agent (wrap in { input })
    const result = await certificateAgent.execute({ input: inputData });

    // Try to read public file url from agent output
    const fileUrl = result?.output?.fileUrl || null;
    const downloadUrl = fileUrl ? fileUrl : `/certificates/${path.basename(result?.output?.filePath || "certificate.pdf")}`;

    const { name, course, date } = inputData;

    // Construct the final rich response message
    const finalMessage = `✅ Certificate Generated Successfully!

📄 Name: ${name || "N/A"}
🎓 Course: ${course || "N/A"}
📅 Date: ${date || "N/A"}

🔗 Download Certificate: ${downloadUrl}`;


    return res.json({
      output: finalMessage,
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