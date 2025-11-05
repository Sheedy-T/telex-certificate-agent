import express from "express";
import dotenv from "dotenv";
import telexRoutes from "./routes/telexRoutes";
import { log } from "./utils/logger";
import  mastra from "./mastra-agent"; // ✅ Import to ensure agent loads

dotenv.config();

const app = express();

// ✅ Middleware
app.use(express.json());

// ✅ Load routes
app.use("/telex", telexRoutes);

// ✅ Initialize Mastra agent (ensures it’s ready)
if (mastra) {
  log("🤖 Mastra certificate agent initialized successfully");
} else {
  log("⚠️ Mastra agent failed to initialize");
}

// ✅ Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => log(`✅ Server running on port ${PORT}`));
