import { config } from "dotenv";
import { HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { genAI } from "../gemini.js";

config();

const GENERATION_CONFIG = {
    temperature: 0.9,
    topK: 1,
    topP: 1,
    maxOutputTokens: 2048,
};

const SAFETY_SETTINGS = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

var userChats = {};

async function createChat(userId){

    const model = genAI.getGenerativeModel({ model: process.env.MODEL_NAME });

    const chat = model.startChat({
        generationConfig: GENERATION_CONFIG,
        safetySettings: SAFETY_SETTINGS,
        history: [],
    });

    userChats[userId] = chat;

}

export const generateGeminiChat = async (req, res) => {
    const userId = req.body.userId;
    const userInput = req.body.userInput;

    if (!userId || !userInput) {
        return res.status(400).json({ error: "UserId and UserInput is required" });
    }

    try {
        if (!(userId in userChats)) {
            await createChat(userId);
        }

        const chat = userChats[userId];
        let message;

        if (!chat.history || chat.history.length === 0) {
            message = `You are a kind and patient tutor helping a student with dyscalculia.

Here is a problem that involves some type of calculation or mathematical reasoning:
"${userInput}"

Your job is to:
1. Solve the problem clearly and slowly, step-by-step.
2. Explain why each step is done — avoid assuming prior math confidence.
3. Use simple, real-life analogies (like money, apples, boxes, measuring tape) wherever helpful.
4. Avoid skipping any steps, even small ones.
5. Keep the tone warm, encouraging, and easy to understand.
6. At the end, kindly ask the student if they’d like to revisit or clarify any step.`;
        } else {
            message = `You're continuing to help a student with dyscalculia.

Please answer their question in a calm, encouraging, and step-by-step way using simple language.

Student's question: "${userInput}"`;
        }

        const result = await chat.sendMessage(message);

        if (result.error) {
            return res.status(500).json({ error: result.error.message });
        }

        const response = result.response.text();
        res.json({ response: response });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
