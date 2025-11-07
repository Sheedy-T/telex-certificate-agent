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

// Helper function to handle async file stream writing
const streamToPromise = (stream: fs.WriteStream) => {
  return new Promise<void>((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
};

// Helper function to handle async Cloudinary upload
const uploadToCloudinary = (localPath: string) => {
  return new Promise<UploadApiResponse>((resolve, reject) => {
    cloudinary.uploader.upload(
      localPath,
      { resource_type: "raw", folder: "certificates" },
      (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
        if (error || !result) {
          return reject(error || new Error("Cloudinary result missing"));
        }
        resolve(result);
      }
    );
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

    let fileUrl: string;
    const localFallbackUrl = `/certificates/${fileName}`;

    // -------------------------------
    // Cloudinary upload (or local fallback)
    // -------------------------------
    try {
      const result = await uploadToCloudinary(localPath);
      fileUrl = result.secure_url;
      console.log("✅ Cloudinary upload successful:", fileUrl);
    } catch (error) {
      console.error("❌ Cloudinary upload failed, using local fallback:", error);
      // Use the local fallback URL if Cloudinary fails
      fileUrl = localFallbackUrl;
    }

    // -------------------------------
    // Send final rich response (This is guaranteed to run, preventing timeout)
    // -------------------------------
    const finalMessage = `✅ Certificate Generated Successfully!

📄 Name: ${name}
🎓 Course: ${course}
📅 Date: ${date}

🔗 Download Certificate: ${fileUrl}`;

    return res.json({
      message: finalMessage,
      fileUrl: fileUrl,
      localFallbackUrl: localFallbackUrl,
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