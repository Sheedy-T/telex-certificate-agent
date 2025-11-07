// src/mastra-agent.ts
import { Mastra } from "@mastra/core";
import { Agent } from "@mastra/core/agent";
import { z } from "zod";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";

const certificateSchema = z.object({
  name: z.string(),
  course: z.string(),
  date: z.string().optional(),
});

type CertificateInput = z.infer<typeof certificateSchema>;

class CertificateAgent extends Agent {
  constructor() {
    super({
      name: "certificateAgent",
      description: "Generates course completion certificates as downloadable PDFs.",
      instructions: "You are an AI agent that creates PDF certificates for users.",
      model: { id: "openai/gpt-4o-mini" },
    });
  }

  async execute(input: { input: CertificateInput }) {
    const { name, course, date } = certificateSchema.parse(input.input);

    // Ensure output directory exists
    const certDir = path.resolve("./certificates");
    if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive: true });

    // Generate filename and path
    const safeName = name.replace(/\s+/g, "_");
    const fileName = `${safeName}_certificate.pdf`;
    const filePath = path.join(certDir, fileName);

    // Create PDF
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    // Simple layout (feel free to style or add logo)
    doc.fontSize(26).text("Certificate of Completion", { align: "center" });
    doc.moveDown(2);

    doc.fontSize(20).text(`This certifies that ${name}`, { align: "center" });
    doc.moveDown();
    doc.fontSize(16).text(`has successfully completed the course "${course}".`, { align: "center" });
    doc.moveDown();
    doc.fontSize(14).text(`Date: ${date || new Date().toISOString().split("T")[0]}`, { align: "center" });

    doc.end();

    // Wait for the file to finish writing (with error handling)
    await new Promise<void>((resolve, reject) => {
      writeStream.on("finish", () => resolve());
      writeStream.on("error", (err) => reject(err));
    });

    // Build public file URL using BASE_URL env variable (set this in production)
    // If BASE_URL not set, fall back to localhost with PORT
    const baseUrlRaw = process.env.BASE_URL?.replace(/\/+$/, "") || `http://localhost:${process.env.PORT || "8080"}`;
    const fileUrl = `${baseUrlRaw}/certificates/${encodeURIComponent(fileName)}`;

    console.log(`✅ Certificate generated: ${filePath} -> ${fileUrl}`);

    return {
      output: {
        message: `Certificate generated successfully for ${name}`,
        filePath,
        fileName,
        fileUrl,
      },
      status: "success",
    };
  }
}

export const certificateAgent = new CertificateAgent();

const mastra = new Mastra({
  agents: { certificateAgent },
});

export default mastra;
