// src/mastra-agent.ts
import { Mastra } from "@mastra/core";
import { Agent } from "@mastra/core/agent";
import { z } from "zod";
import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";

// Define input schema
const certificateSchema = z.object({
  name: z.string(),
  course: z.string(),
  date: z.string(),
});

type CertificateInput = z.infer<typeof certificateSchema>;

// ✅ Custom Agent subclass with all required fields
class CertificateAgent extends Agent {
  constructor() {
    super({
      name: "certificateAgent",
      description: "Generates course completion certificates as PDFs.",
      instructions:
        "You are an AI agent that generates PDF certificates based on provided input.",
      // ✅ FIX: Mastra model must be a model ID string
      model: { id: "openai/gpt-4o-mini" },
    });
  }

  async execute(input: CertificateInput) {
    const { name, course, date } = certificateSchema.parse(input);

    const certDir = path.resolve("./certificates");
    if (!fs.existsSync(certDir)) fs.mkdirSync(certDir);

    const filename = `${name.replace(/\s+/g, "_")}_certificate.pdf`;
    const filePath = path.join(certDir, filename);

    const doc = new PDFDocument({ size: "A4" });
    doc.pipe(fs.createWriteStream(filePath));

    doc.fontSize(26).text("Certificate of Completion", { align: "center" });
    doc.moveDown(2);
    doc.fontSize(20).text(`This certifies that ${name}`, { align: "center" });
    doc.moveDown();
    doc.text(`has successfully completed the ${course} course.`, {
      align: "center",
    });
    doc.moveDown();
    doc.text(`Date: ${date}`, { align: "center" });
    doc.end();

    console.log(`✅ Certificate generated: ${filePath}`);

    return {
      message: `✅ Certificate generated for ${name}`,
      filePath,
    };
  }
}

// ✅ Export agent instance
export const certificateAgent = new CertificateAgent();

// ✅ Register in Mastra
const mastra = new Mastra({
  agents: { certificateAgent },
});

export default mastra;
