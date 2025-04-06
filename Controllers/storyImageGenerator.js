// Import necessary modules and configurations
import { config } from "dotenv";
import { getGeminiResponse } from "./PromptController.js";
import { getImage } from "./imageGeneratorController.js";

// Load environment variables from .env file
config();

// Function to generate multiple meme prompts for a story mode
async function generateMultiplePrompts(prompt,level,subject) {
  // Instruction prompt for the Gemini API to generate meme ideas
  const instruction = `Generate 4 unique ADHD-friendly educational meme ideas based on the topic: "${prompt}" for a student in  ${level}, on the topic of ${subject}.

Each meme should include:
  1. A short **fact-based meme caption** that is funny, clear, and educational (max 20 words).
  2. A **visual description** of what the meme image should show — creative, directly tied to the concept, and simple enough for AI image generation.

The memes should help students understand and remember the concept using humor, visual association, and relatable context.
Keep the tone light, slightly exaggerated if helpful, and always factually correct.

If it is suitable try to structure the prompts in a way that they can be used for a story mode, where each meme builds on the previous one.

  Return the response in this exact JSON format:
  {
    "memes": [
      {
        "caption": "Funny educational caption here",
        "visual": "Description of what the image should depict"
      },
      {
        "caption": "Another caption",
        "visual": "Another visual description"
      },
      ...
    ]
  }`;

  // Get response from Gemini API using the generated instruction
  let newResponse = await getGeminiResponse(instruction);
  // Clean up the response by removing any markdown formatting (
  newResponse = newResponse
    .trim()
    .replace(/^```json|```$/g, "")
    .trim();

  let generatedMemes = [];
  try {
    // Parse the JSON response from the Gemini API
    const parsedResponse = JSON.parse(newResponse);

    // Check if the response contains a valid "memes" array
    if (parsedResponse.memes && Array.isArray(parsedResponse.memes)) {
      generatedMemes = parsedResponse.memes; // Assign the memes array to the generatedMemes variable
    }
  } catch (error) {
    // Log any errors that occur during JSON parsing
    console.error("Error parsing Gemini response:", error);

    // Return an error response if parsing fails
    return { error: "Failed to parse response from AI" };
  }

  // Return the successfully parsed memes array
  return { memes: generatedMemes };
}

export const generateStoryMode = async (req, res) => {
  try {
    // Extract required parameters from the request body
    const { userId, lessonId, prompt, level, subject } = req.body;

    // Validate that all required parameters are provided
    if (!prompt || !userId || !lessonId || !level || !subject) {
      return res
        .status(400)
        .json({ error: "Required Parameters are missing or invalid" });
    }

    // Generate multiple meme prompts using the provided parameters
    const storyPrompts = await generateMultiplePrompts(
      prompt,
      level,
      subject
    );

    // Check if the response contains valid memes
    if (!storyPrompts || !storyPrompts.memes) {
      return res
        .status(500)
        .json({ error: "Failed to generate story prompts" });
    }

    // Handle the case where no memes are generated
    if (storyPrompts.memes.length === 0) {
      return res.status(400).json({ error: "No memes generated" });
    }

    // Handle any errors returned from the meme generation process
    if (storyPrompts.error) {
      return res.status(500).json({ error: storyPrompts.error });
    }

    // Generate images for each meme using the visual descriptions
    const generatedImages = await Promise.all(
      storyPrompts.memes.map(async (meme) => {
        const { imageUrl, imageFilename } = await getImage(
          userId,
          lessonId,
          meme.visual
        );
        return { imageUrl, imageFilename, caption: meme.caption }; // Return the image details along with the caption
      })
    );

    // Send the generated images as the response
    res.status(200).json({ response: generatedImages });
  } catch (error) {
    // Log any errors that occur during the process
    console.error("Error generating story:", error);

    // Return a generic internal server error response
    res.status(500).json({ error: "Internal server error" });
  }
};
