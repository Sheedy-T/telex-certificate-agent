import express from "express";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
// Removed: import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from "cloudinary";

const router = express.Router();

// ===============================
// 🔧 Helper Functions
// ===============================

// Helper function to handle async file stream writing
const streamToPromise = (stream: fs.WriteStream) => {
  return new Promise<void>((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
};

// ===============================
// 🧠 Telex A2A Endpoint
// ===============================
router.post("/a2a-endpoint", async (req, res) => {
  try {
    const { input } = req.body;

    if (!input || typeof input !== "string") {
      return res.status(400).json({ error: "Missing or invalid 'input' field" });
    }

    // -------------------------------
    // Parse inline command input: name, course, date
    // Example: name="Shedrack Tabansi" course="AI Integration Bootcamp" date="October 20, 2023"
    // -------------------------------
    const regex = /(\w+)=["']([^"']+)["']/g;
    const fields: any = {};
    let match;
    while ((match = regex.exec(input))) {
      fields[match[1]] = match[2];
    }

    const { name, course, date } = fields;
    if (!name || !course || !date) {
      return res.status(400).json({ error: "Missing required fields: name, course, or date in input string." });
    }

    console.log("Parsed Telex input:", { name, course, date });

    // -------------------------------
    // Generate PDF locally
    // -------------------------------
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const fileName = `${name.replace(/\s+/g, "_")}_${Date.now()}.pdf`;
    const localDir = path.resolve("./certificates");
    if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
    const localPath = path.join(localDir, fileName);
    const writeStream = fs.createWriteStream(localPath);
    doc.pipe(writeStream);

    // Certificate design
    doc
      .fontSize(28)
      .font("Helvetica-Bold")
      .text("Certificate of Completion", { align: "center" })
      .moveDown(1.5)
      .fontSize(18)
      .font("Helvetica")
      .text("This certifies that", { align: "center" })
      .moveDown(0.5)
      .fontSize(26)
      .font("Helvetica-Bold")
      .text(name, { align: "center" })
      .moveDown(0.5)
      .fontSize(18)
      .font("Helvetica")
      .text("has successfully completed the course", { align: "center" })
      .moveDown(0.5)
      .fontSize(24)
      .font("Helvetica-Bold")
      .text(course, { align: "center" })
      .moveDown(1.5)
      .fontSize(14)
      .font("Helvetica")
      .text(`Issued on: ${date}`, { align: "center" })
      .moveDown(0.3)
      .text("By: Telex Certificate Generator", { align: "center" });

    doc.end();

    // -------------------------------
    // 1. Await local PDF to finish writing
    // -------------------------------
    await streamToPromise(writeStream);
    console.log(`✅ Local certificate file created: ${localPath}`);

    // The file URL is now the local path served publicly
    const fileUrl = `/certificates/${fileName}`; 

    // -------------------------------
    // 2. Send final rich response
    // -------------------------------
    const finalMessage = `✅ Certificate Generated Successfully!

📄 Name: ${name}
🎓 Course: ${course}
📅 Date: ${date}

🔗 Download Certificate: ${fileUrl}`;

    return res.json({
      message: finalMessage,
      fileUrl: fileUrl,
      localFallbackUrl: fileUrl, // fileUrl and localFallbackUrl are now the same
    });
  } catch (err: any) {
    console.error("❌ Error generating certificate:", err);
    return res.status(500).json({
      error: "Failed to generate certificate",
      details: err.message
    });
  }
});

export default router;