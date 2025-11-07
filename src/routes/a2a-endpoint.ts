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
// Generates PDF certificates and uploads to Cloudinary (with local fallback)
// ===============================
router.post("/a2a-endpoint", async (req, res) => {
  try {
    const { name, course, date } = req.body;

    // 🧾 Validate inputs
    if (!name || !course || !date) {
      return res.status(400).json({
        error: "Missing required fields: name, course, or date",
      });
    }

    console.log("Mastra input:", req.body); // For debugging

    // Create PDF document
    const doc = new PDFDocument({ size: "A4", margin: 50 });

    // Generate a temporary filename for local fallback
    const fileName = `${name.replace(/\s+/g, "_")}_${Date.now()}.pdf`;
    const localDir = path.resolve("./certificates");
    if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
    const localPath = path.join(localDir, fileName);
    const writeStream = fs.createWriteStream(localPath);

    // Pipe PDF to local file and to Cloudinary
    doc.pipe(writeStream);

    // Certificate design
    doc
      .fontSize(28)
      .font("Helvetica-Bold")
      .text("Certificate of Completion", { align: "center" })
      .moveDown(1.5);

    doc
      .fontSize(18)
      .font("Helvetica")
      .text("This certifies that", { align: "center" })
      .moveDown(0.5);

    doc
      .fontSize(26)
      .font("Helvetica-Bold")
      .text(name, { align: "center" })
      .moveDown(0.5);

    doc
      .fontSize(18)
      .font("Helvetica")
      .text("has successfully completed the course", { align: "center" })
      .moveDown(0.5);

    doc
      .fontSize(24)
      .font("Helvetica-Bold")
      .text(course, { align: "center" })
      .moveDown(1.5);

    doc
      .fontSize(14)
      .font("Helvetica")
      .text(`Issued on: ${date}`, { align: "center" })
      .moveDown(0.3)
      .text("By: Telex Certificate Generator", { align: "center" });

    doc.end();

    // Wait until the PDF is fully written locally
    writeStream.on("finish", () => {
      // Try Cloudinary upload
      cloudinary.uploader.upload(
        localPath,
        { resource_type: "raw", folder: "certificates" },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            console.error("❌ Cloudinary upload failed, using local fallback:", error);

            // Respond with local fallback URL
            return res.json({
              output: {
                message: `Certificate generated successfully for ${name}, using local file fallback.`,
                fileUrl: `/certificates/${fileName}`,
              },
              status: "success",
            });
          }

          // Success with Cloudinary
          return res.json({
            output: {
              message: `Certificate generated successfully for ${name}.`,
              fileUrl: result.secure_url,
            },
            status: "success",
          });
        }
      );
    });

  } catch (err) {
    console.error("❌ Error generating certificate:", err);
    res.status(500).json({ error: "Failed to generate certificate" });
  }
});

export default router;
