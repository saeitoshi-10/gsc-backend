import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "dotenv";

config();

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);