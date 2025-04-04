import { config } from "dotenv";
import { getGeminiResponse } from "./PromptController.js";
import { getImage } from "./imageGeneratorController.js";

config();

async function generateMultiplePrompts(prompt){

    const instruction = `Generate at least 4 unique story prompts, which try to narrate a story and would be used for image generation based on the following idea: "${prompt}". 
    Return the response in the following JSON format:
    {
        "prompts": ["Prompt 1", "Prompt 2", "Prompt 3", "Prompt 4"]
    }`;

    let newResponse = await getGeminiResponse(instruction);
    newResponse = newResponse.trim().replace(/^```json|```$/g, "").trim();

    let generatedPrompts = [];
    try {
        const parsedResponse = JSON.parse(newResponse);
        if (parsedResponse.prompts && Array.isArray(parsedResponse.prompts)) {
            generatedPrompts = parsedResponse.prompts;
        }
    } catch (error) {
        console.error("Error parsing Gemini response:", error);
        return { error: "Failed to parse response from AI" };
    }

    return { prompts: generatedPrompts };

}

export const generateStoryMode = async (req, res) => {
  try {

    const { userId, lessonId, prompt } = req.body; 

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const storyPrompts = await generateMultiplePrompts(prompt);

    if (storyPrompts.error) {
        return res.status(500).json({ error: response.error });
    }    

    const generatedImages = await Promise.all(
      storyPrompts.prompts.map(async (p) => {
        const { imageUrl, imageFilename } = await getImage(userId, lessonId, p);
        return { imageUrl, imageFilename };
      })
    );
  
    res.status(200).json({ response: generatedImages });

  } 
  catch (error) {
    console.error("Error generating story:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};