import { Request, Response } from "express";
import { createCertificate } from "../services/certificateService";
import { log } from "../utils/logger";

export const generateCertificate = async (req: Request, res: Response) => {
  try {
    const { name, program, date } = req.body;

    if (!name || !program || !date) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const pdfPath = await createCertificate(name, program, date);
    log(`Certificate generated for ${name}`);

    return res.status(200).json({
      message: "Certificate generated successfully",
      file: pdfPath
    });
  } catch (error: any) {
    log("Error generating certificate: " + error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
