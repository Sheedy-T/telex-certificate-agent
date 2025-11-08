import express from "express";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
// import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from "cloudinary"; // Removed Cloudinary import

const router = express.Router();

// ===============================
// 🔧 Configuration (Cloudinary removed)
// ===============================
// Cloudinary config removed.
// Note: Ensure your hosting environment properly serves files from the /certificates directory.

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
    // -------------------------------
    const regex = /(\w+)=["']([^"']+)["']/g;
    const fields: any = {};
    let match;
    while ((match = regex.exec(input))) {
      fields[match[1]] = match[2];
    }

    const { name, course, date } = fields;
    if (!name || !course || !date) {
      return res.status(400).json({ error: "Missing required fields: name, course, or date" });
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
    // Wait for local PDF to finish
    // -------------------------------
    await streamToPromise(writeStream);
    console.log(`✅ Local certificate file created: ${localPath}`);

    const fileUrl = `/certificates/${fileName}`; // Direct local URL

    // -------------------------------
    // Send final rich response (Guaranteed to run quickly)
    // -------------------------------
    const finalMessage = `✅ Certificate Generated Successfully!

📄 Name: ${name}
🎓 Course: ${course}
📅 Date: ${date}

🔗 Download Certificate: ${fileUrl}`;

    return res.json({
      message: finalMessage,
      fileUrl: fileUrl,
      download_url: fileUrl, // Use download_url as required by some A2A validators
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