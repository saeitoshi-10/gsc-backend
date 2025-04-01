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

    if(!userId || !userInput){
        return res.status(400).json({ error: "UserId and UserInput is required" });
    }

    try{
        
        if(!(userId in userChats)){
            await createChat(userId);
        }

        const chat = userChats[userId];
        const result = await chat.sendMessage(userInput);

        if (result.error) {
            return res.status(500).json({ error: result.error.message });
        }

        const response = result.response.text();
        res.json({ response: response});
        
    } 
    catch (error) {
        return res.status(500).json({ error: result.error.message });
    }

}

