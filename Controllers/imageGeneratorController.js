import { GoogleGenAI } from "@google/genai";
import { Storage } from "@google-cloud/storage";
import { config } from "dotenv";

config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const storage = new Storage();
const bucketName = "gsc-bucket-007";
const bucket = storage.bucket(bucketName);

export const generateGeminiImage = async (req, res) => {
  const { userId, lessonId, prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  const { imageUrl, imageFilename } = await getImage(userId, lessonId, prompt);

  res.json({ imageUrl, imageFilename });
};

export const getImage = async (userId, lessonId, prompt) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp-image-generation",
      contents: prompt,
      config: {
        responseModalities: ["Text", "Image"],
      },
    });

    let imageFilename = null;
    let imageUrl = null;

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const imageData = part.inlineData.data;
        const buffer = Buffer.from(imageData, "base64");

        const timestamp = Date.now();
        const storageFilename = `${userId}/${lessonId}/gemini-image-${timestamp}.png`;
        const file = bucket.file(storageFilename);

        await file.save(buffer, {
          metadata: { contentType: "image/png" },
        });

        imageUrl = `https://storage.googleapis.com/${bucketName}/${storageFilename}`;
        imageFilename = storageFilename;
        break;
      }
    }

    if (!imageUrl) {
      throw new Error("Failed to generate or store image");
    }

    return { imageUrl, imageFilename };
  } catch (error) {
    console.error("Gemini API or Cloud Storage Error:", error);
    throw new Error(error.message || "Unknown error occurred during image generation");
  }
};