import { genAI } from "../gemini.js";
import dotenv from "dotenv";

dotenv.config();

async function getGeminiResponse(prompt) {

  try {

    const model = genAI.getGenerativeModel({model: process.env.MODEL_NAME});

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    return response;

  } 
  catch (err) {
    console.error("Gemini API Error:", err);
    throw new Error(err.message);
  }

}

export const generateGeminiResponse = async (req, res) => {

  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  try {
    const response = await getGeminiResponse(prompt);
    res.json({ response });
  } 
  catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }

};


