import express from "express";
import PDFDocument from "pdfkit";
import stream from "stream";
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from "cloudinary";

const router = express.Router();

/* ===============================
   🔧 Cloudinary Configuration
================================= */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

/* ===============================
   🧠 Telex A2A Endpoint
   Generates PDF certificates and uploads them to Cloudinary
================================= */
router.post("/a2a-endpoint", async (req, res) => {
  try {
    const { name, course, date } = req.body;

    // 🧾 Validate inputs
    if (!name || !course || !date) {
      return res.status(400).json({
        error: "Missing required fields: name, course, or date",
      });
    }

    // 📄 Create a PDF document in memory
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const pdfStream = new stream.PassThrough();
    doc.pipe(pdfStream);

    /* ===============================
       🎨 Certificate Design
    ============================== */
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

    /* ===============================
       ☁️ Upload PDF to Cloudinary
    ============================== */
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: "raw", folder: "certificates" },
      (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
        if (error || !result) {
          console.error("❌ Cloudinary upload failed:", error);
          return res.status(500).json({ error: "Cloudinary upload failed" });
        }

        // ✅ Respond to Telex with success message
        res.json({
          message: `Certificate generated successfully for ${name}.`,
          certificate_url: result.secure_url,
          details: { name, course, date },
        });
      }
    );

    // Pipe the PDF stream to Cloudinary upload
    pdfStream.pipe(uploadStream);

  } catch (err) {
    console.error("❌ Error generating certificate:", err);
    res.status(500).json({ error: "Failed to generate certificate" });
  }
});

export default router;
