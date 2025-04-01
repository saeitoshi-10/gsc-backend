import fs from "fs";
import { config } from "dotenv";
import { genAI } from "../gemini.js";

config();

const imageToBase64 = (filePath) => fs.readFileSync(filePath, { encoding: "base64" });

export const generateGeminiSummary = async (req, res) => {

  try {

    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const base64Image = imageToBase64(req.file.path);

    const model = genAI.getGenerativeModel({ model: process.env.MODEL_NAME });
    const result = await model.generateContent([
      { text: "Summarize the content of this image." },
      { inlineData: { mimeType: req.file.mimetype, data: base64Image } },
    ]);

    const summary = result.response.text();

    fs.unlinkSync(req.file.path);

    res.json({ summary });

  } 
  catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: "Failed to process image", details: error.message });
  }

};
