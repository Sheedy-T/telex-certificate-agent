import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

export const createCertificate = async (name: string, program: string, date: string) => {
  const pdfDir = path.join(__dirname, "../../certificates");
  if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir);

  const filePath = path.join(pdfDir, `${name.replace(/\s+/g, "_")}_certificate.pdf`);
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  doc.fontSize(26).text("Certificate of Completion", { align: "center" });
  doc.moveDown();
  doc.fontSize(18).text(`This certifies that`, { align: "center" });
  doc.moveDown();
  doc.fontSize(24).text(`${name}`, { align: "center" });
  doc.moveDown();
  doc.fontSize(18).text(`has successfully completed the program`, { align: "center" });
  doc.moveDown();
  doc.fontSize(20).text(`${program}`, { align: "center" });
  doc.moveDown();
  doc.fontSize(14).text(`Date: ${date}`, { align: "center" });
  doc.moveDown(2);
  doc.fontSize(14).text("Telex.im Program Certification Agent", { align: "center" });

  doc.end();

  return new Promise<string>((resolve, reject) => {
    stream.on("finish", () => resolve(filePath));
    stream.on("error", reject);
  });
};
