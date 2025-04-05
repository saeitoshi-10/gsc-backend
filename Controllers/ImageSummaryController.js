import fs from "fs";
import { config } from "dotenv";
import { genAI } from "../gemini.js";
import { fileTypeFromBuffer } from 'file-type';
import mammoth from 'mammoth'; 
import path from 'path'; 

config();

const bufferToBase64 = (buffer) => buffer.toString('base64');

async function extractTextFromDocx(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer: buffer });
    return result.value;
  } catch (error) {
    console.error("Error extracting text from DOCX:", error);
    return null;
  }
}

export const generateGeminiSummary = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileBuffer = fs.readFileSync(req.file.path);
    const fileInfo = await fileTypeFromBuffer(fileBuffer);

    let mimeType = fileInfo ? fileInfo.mime : null;
    const base64File = bufferToBase64(fileBuffer);
    const fileExtension = path.extname(req.file.originalname).toLowerCase(); // Get original extension

    const model = genAI.getGenerativeModel({ model: process.env.MODEL_NAME });
    let result;

    if (mimeType && mimeType.startsWith("image/")) {
      result = await model.generateContent([
        { text: "Identify and describe any factual information presented in this image..." },
        { inlineData: { mimeType: mimeType, data: base64File } },
      ]);
    } else if (mimeType === "application/pdf") {
      result = await model.generateContent([
        { text: "Read this educational document and extract all the factual information..." },
        { inlineData: { mimeType: mimeType, data: base64File } },
      ]);
    } else if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" // .docx
    ) {
      const extractedText = await extractTextFromDocx(fileBuffer);
      if (extractedText) {
        result = await model.generateContent([
          { text: `Please read this educational text and identify all the factual statements...${extractedText}` },
        ]);
      } else {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "Failed to extract text from DOCX file." });
      }
    } else if (mimeType === "text/plain" || mimeType?.startsWith("text/")) { // Added null check with optional chaining
      const textContent = fileBuffer.toString('utf-8');
      result = await model.generateContent([
        { text: `Read this educational text and extract all the factual information...${textContent}` },
      ]);
    } else if (mimeType === null) {
      // Handle cases where file-type couldn't determine the type
      if (fileExtension === '.txt' || fileExtension === '.cpp' || fileExtension === '.h') {
        const textContent = fileBuffer.toString('utf-8');
        result = await model.generateContent([
          { text: `Read this code or text file and extract all the factual information, important concepts, and any explanations provided.\n\n${textContent}` },
        ]);
        mimeType = 'text/plain'; // Set a default mimeType for consistency
      } else if (fileExtension === '.doc' || fileExtension === '.rtf') {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: `Direct processing of ${fileExtension} files is not supported. Consider converting to plain text or PDF.` });
      } else {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: `Unsupported file type: ${fileExtension}` });
      }
    } else if (mimeType?.startsWith("application/")) { // Added null check with optional chaining
      const textContent = fileBuffer.toString('utf-8');
      result = await model.generateContent([
        { text: `Analyze the content of this file for any factual information...${textContent}` },
      ]);
    } else {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: `Unsupported file type (MIME: ${mimeType || 'unknown'}, Extension: ${fileExtension})` });
    }

    const summary = result.response.text();

    fs.unlinkSync(req.file.path);

    res.json({ summary });
  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: "Failed to process file", details: error.message });
  }
};