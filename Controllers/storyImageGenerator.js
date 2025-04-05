import { config } from "dotenv";
import { getGeminiResponse } from "./PromptController.js";
import { getImage } from "./imageGeneratorController.js";

config();

async function generateMultiplePrompts(prompt,level,subject) {
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

  let newResponse = await getGeminiResponse(instruction);
  newResponse = newResponse
    .trim()
    .replace(/^```json|```$/g, "")
    .trim();

  let generatedMemes = [];
  try {
    const parsedResponse = JSON.parse(newResponse);
    if (parsedResponse.memes && Array.isArray(parsedResponse.memes)) {
      generatedMemes = parsedResponse.memes;
    }
  } catch (error) {
    console.error("Error parsing Gemini response:", error);
    return { error: "Failed to parse response from AI" };
  }

  return { memes: generatedMemes };
}

export const generateStoryMode = async (req, res) => {
  try {
    const { userId, lessonId, prompt, level, subject } = req.body;

    if (!prompt || !userId || !lessonId||!level||!subject) {
      return res
        .status(400)
        .json({ error: "Required Parameters are missing or invalid" });
    }

    const storyPrompts = await generateMultiplePrompts(
      prompt,
      level,
      subject
    );
    if (!storyPrompts || !storyPrompts.memes) {
      return res
        .status(500)
        .json({ error: "Failed to generate story prompts" });
    }
    if (storyPrompts.memes.length === 0) {
      return res.status(400).json({ error: "No memes generated" });
    }

    if (storyPrompts.error) {
      return res.status(500).json({ error: storyPrompts.error });
    }

    const generatedImages = await Promise.all(
      storyPrompts.memes.map(async (meme) => {
        const { imageUrl, imageFilename } = await getImage(
          userId,
          lessonId,
          meme.visual
        );
        return { imageUrl, imageFilename, caption: meme.caption };
      })
    );

    res.status(200).json({ response: generatedImages });
  } catch (error) {
    console.error("Error generating story:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
