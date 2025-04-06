import { config } from "dotenv";
import { HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { genAI } from "../gemini.js";

// Load environment variables from .env file
config();

// Configuration for the generative AI model
const GENERATION_CONFIG = {
    temperature: 0.9, // Controls randomness in the output
    topK: 1,          // Limits the sampling to the top K tokens
    topP: 1,          // Limits the sampling to the top P cumulative probability
    maxOutputTokens: 2048, // Maximum number of tokens in the output
};

// Safety settings to block harmful content
const SAFETY_SETTINGS = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// Object to store user-specific chat sessions
var userChats = {};

// Function to create a new chat session for a user
async function createChat(userId) {
    // Get the generative AI model using the specified model name from environment variables
    const model = genAI.getGenerativeModel({ model: process.env.MODEL_NAME });

    // Start a new chat session with the specified configuration and safety settings
    const chat = model.startChat({
        generationConfig: GENERATION_CONFIG,
        safetySettings: SAFETY_SETTINGS,
        history: [], // Initialize with an empty history
    });

    // Store the chat session in the userChats object
    userChats[userId] = chat;
}

// Controller function to handle chat generation requests
export const generateGeminiChat = async (req, res) => {
    const userId = req.body.userId; // Extract userId from the request body
    const userInput = req.body.userInput; // Extract userInput from the request body

    // Validate that both userId and userInput are provided
    if (!userId || !userInput) {
        return res.status(400).json({ error: "UserId and UserInput is required" });
    }

    try {
        // If the user does not already have a chat session, create one
        if (!(userId in userChats)) {
            await createChat(userId);
        }

        // Retrieve the user's chat session
        const chat = userChats[userId];
        let message;

        // If the chat history is empty, provide an introductory message
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
            // If there is chat history, continue the conversation
            message = `You're continuing to help a student with dyscalculia.

Please answer their question in a calm, encouraging, and step-by-step way using simple language.

Student's question: "${userInput}"`;
        }

        // Send the message to the generative AI model and get the result
        const result = await chat.sendMessage(message);

        // Handle any errors from the AI model
        if (result.error) {
            return res.status(500).json({ error: result.error.message });
        }

        // Extract the response text and send it back to the client
        const response = result.response.text();
        res.json({ response: response });
    } catch (error) {
        // Handle any unexpected errors
        return res.status(500).json({ error: error.message });
    }
};
