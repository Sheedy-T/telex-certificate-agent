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

// ✅ PRIMARY A2A ENDPOINT: This registers the quick, rich handler from a2a-endpoint.ts
app.use("/", a2aEndpoint); 

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