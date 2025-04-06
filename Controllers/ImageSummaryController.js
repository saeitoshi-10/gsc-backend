// Import necessary modules
import fs from "fs";
import { config } from "dotenv";
import { genAI } from "../gemini.js";
import { fileTypeFromBuffer } from 'file-type';
import mammoth from 'mammoth'; 
import path from 'path'; 
// Load environment variables from .env file
config();

// Helper function to convert a buffer to a base64 string
const bufferToBase64 = (buffer) => buffer.toString('base64');

// Function to extract text from a DOCX file buffer
async function extractTextFromDocx(buffer) {
  try {
    // Use mammoth library to extract raw text
    const result = await mammoth.extractRawText({ buffer: buffer });
    return result.value;
  } catch (error) {
    console.error("Error extracting text from DOCX:", error);
    return null;
  }
}

// Controller function to generate a summary of an image using Gemini API
export const generateGeminiSummary = async (req, res) => {
  try {
    // Check if a file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Read the file buffer from the uploaded file's path
    const fileBuffer = fs.readFileSync(req.file.path);
    // Determine the file type from the buffer
    const fileInfo = await fileTypeFromBuffer(fileBuffer);

    // Get MIME type, use null if fileInfo is not available
    let mimeType = fileInfo ? fileInfo.mime : null;
    // Convert the file buffer to a base64 string
    const base64File = bufferToBase64(fileBuffer);
    const fileExtension = path.extname(req.file.originalname).toLowerCase(); // Get the original file extension

    // Get the generative model from Gemini API
    const model = genAI.getGenerativeModel({ model: process.env.MODEL_NAME });
    let result;

    if (mimeType && mimeType.startsWith("image/")) {
      result = await model.generateContent([
        { text: "Identify and describe any factual information presented in this image..." }, // Prompt for image analysis
        { inlineData: { mimeType: mimeType, data: base64File } }, // Image data
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
        result = await model.generateContent([ // Prompt for educational text extraction
          { text: `Please read this educational text and identify all the factual statements...${extractedText}` },
        ]);
      } else {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "Failed to extract text from DOCX file." });
      }
    } else if (mimeType === "text/plain" || mimeType?.startsWith("text/")) { // Added null check with optional chaining
      const textContent = fileBuffer.toString('utf-8');
      result = await model.generateContent([ // Prompt for educational text extraction
        { text: `Read this educational text and extract all the factual information...${textContent}` },
      ]);
    } else if (mimeType === null) {
      // Handle cases where file-type couldn't determine the type
      if (fileExtension === '.txt' || fileExtension === '.cpp' || fileExtension === '.h') {
        const textContent = fileBuffer.toString('utf-8');
        result = await model.generateContent([ // Prompt for text or code file
          { text: `Read this code or text file and extract all the factual information, important concepts, and any explanations provided.\n\n${textContent}` },
        ]);

        // set mimetype as text for consistency
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
      result = await model.generateContent([ // Generic prompt for application files
        { text: `Analyze the content of this file for any factual information...${textContent}` },
      ]);
    } else {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: `Unsupported file type (MIME: ${mimeType || 'unknown'}, Extension: ${fileExtension})` });
    }
    // Extract the summary from the Gemini API response
    const summary = result.response.text();

    // Delete the uploaded file after processing
    fs.unlinkSync(req.file.path);

    // Send the summary as a JSON response
    res.json({ summary });
  } catch (error) {
    console.error("Gemini API Error:", error);
    // Handle errors and send an error response
    res.status(500).json({ error: "Failed to process file", details: error.message });
  }
};