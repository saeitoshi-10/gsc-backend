import { genAI } from "../gemini.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * Generates a response from the Gemini AI model based on the provided prompt.
 * 
 * @async
 * @function getGeminiResponse
 * @param {string} prompt - The input prompt for the Gemini AI model.
 * @returns {Promise<string>} The generated response from the Gemini AI model.
 * 
 * @throws {Error} Throws an error if the Gemini API call fails.
 */
export async function getGeminiResponse(prompt) {

  try {
    // Retrieve the generative model instance using the model name from environment variables
    const model = genAI.getGenerativeModel({ model: process.env.MODEL_NAME });

    // Generate content using the provided prompt
    const result = await model.generateContent(prompt);

    // Extract the text response from the result
    const response = result.response.text();

    return response;

  } 
  catch (err) {
    // Log the error and rethrow it with a descriptive message
    console.error("Gemini API Error:", err);
    throw new Error(err.message);
  }

}

/**
 * Handles the generation of a Gemini response based on the provided prompt.
 * 
 * @async
 * @function generateGeminiResponse
 * @param {Object} req - The HTTP request object.
 * @param {Object} req.body - The body of the HTTP request.
 * @param {string} req.body.prompt - The prompt string provided by the client.
 * @param {Object} res - The HTTP response object.
 * @returns {void} Sends a JSON response containing the Gemini response or an error message.
 * 
 * @throws {Error} Returns a 400 status code if the prompt is missing in the request body.
 * @throws {Error} Returns a 500 status code if an error occurs during the Gemini response generation.
 */
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


