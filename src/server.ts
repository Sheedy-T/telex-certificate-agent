// src/server.ts
import express from "express";
import dotenv from "dotenv";
import path from "path";
import telexRoutes from "./routes/telexRoutes";
import { log } from "./utils/logger";
import mastra, { certificateAgent } from "./mastra-agent";
// We no longer need the 'a2a-endpoint.ts' file, this handler replaces it.
// import a2aEndpoint from "./routes/a2a-endpoint"; 

dotenv.config();

const app = express();
app.use(express.json());

// Serve generated certificates publicly
app.use("/certificates", express.static(path.resolve("./certificates")));

// Normal telex/manual route(s)
app.use("/telex", telexRoutes);

// -----------------------------------------------------------------
// ✅ THIS IS THE PRIMARY A2A HANDLER
// -----------------------------------------------------------------
app.post("/a2a-endpoint", async (req, res) => {
  try {
    const { input } = req.body; // input is: 'name="Shedrack..." course="..."'
    if (!input || typeof input !== "string") {
      log(`⚠️ A2A Error: Missing or invalid 'input' field`);
      return res.status(400).json({ error: "Missing or invalid 'input' field" });
    }

    // --- 1. PARSE THE STRING INPUT ---
    const regex = /(\w+)=["']([^"']+)["']/g;
    const fields: any = {};
    let match;
    while ((match = regex.exec(input))) {
      fields[match[1]] = match[2];
    }

    // The Mastra agent expects an object
    const inputData = {
      name: fields.name,
      course: fields.course,
      date: fields.date || new Date().toISOString().split("T")[0] // Add default date
    };

    if (!inputData.name || !inputData.course) {
      log(`⚠️ A2A Error: Failed to parse input string: ${input}`);
      return res.status(400).json({ error: "Invalid input format or missing fields" });
    }

    log(`✅ A2A Parsed Input: ${JSON.stringify(inputData)}`);

    // --- 2. EXECUTE THE AGENT ---
    // This agent (mastra-agent.ts) generates the PDF and returns file info
    const result = await certificateAgent.execute({ input: inputData });
    
    // result.output = { message: '...', filePath: '...', fileUrl: '...' }

    // --- 3. FORMAT THE *FINAL* RICH RESPONSE ---
    const { name, course, date } = inputData;
    const downloadUrl = result?.output?.fileUrl || `/certificates/${result?.output?.fileName || 'certificate.pdf'}`;

    const finalMessage = `✅ Certificate Generated Successfully!

📄 Name: ${name}
🎓 Course: ${course}
📅 Date: ${date}

🔗 Download Certificate: ${downloadUrl}`;

    // --- 4. SEND THE CORRECT JSON RESPONSE ---
    // This format MUST match your agent's JSON config 'output_fields'
    return res.json({
      message: finalMessage,
      fileUrl: downloadUrl,
      localFallbackUrl: downloadUrl,
    });

  } catch (err: any) {
    log(`⚠️ A2A Error in /a2a-endpoint: ${err?.message || err}`);
    return res.status(500).json({ error: "Internal server error" });
  }
});
// -----------------------------------------------------------------

// Mastra init log
if (mastra) {
  log("🤖 Mastra certificate agent initialized successfully");
} else {
  log("⚠️ Mastra agent failed to initialize");
}

// health
app.get("/", (_req, res) => res.send("✅ Telex Certificate Agent is live"));

// start
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => log(`✅ Server running on port ${PORT}`));