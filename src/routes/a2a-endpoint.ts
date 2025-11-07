import express from "express";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from "cloudinary";

const router = express.Router();

// ===============================
// 🔧 Cloudinary Configuration
// ===============================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ===============================
// 🧠 Telex A2A Endpoint
// ===============================
router.post("/a2a-endpoint", async (req, res) => {
  try {
    const { input } = req.body; // Telex sends inline input as a single string

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
      return res.status(400).json({ error: "Missing required fields: name, course, or date" });
    }

    console.log("Parsed Telex input:", { name, course, date });

    // -------------------------------
    // Generate PDF
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
    writeStream.on("finish", () => {
      // Try Cloudinary upload
      cloudinary.uploader.upload(
        localPath,
        { resource_type: "raw", folder: "certificates" },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            console.error("❌ Cloudinary upload failed, using local fallback:", error);

            return res.json({
              message: `✅ Certificate generated successfully for ${name}, using local fallback.`,
              fileUrl: `/certificates/${fileName}`,
              localFallbackUrl: `/certificates/${fileName}`,
            });
          }

          // Success: Cloudinary uploaded
          return res.json({
            message: `✅ Certificate generated successfully for ${name}.`,
            fileUrl: result.secure_url,
            localFallbackUrl: `/certificates/${fileName}`,
          });
        }
      );
    });

  } catch (err) {
    console.error("❌ Error generating certificate:", err);
    return res.status(500).json({ error: "Failed to generate certificate" });
  }
});

export default router;
