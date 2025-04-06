// Import the GoogleGenAI class for interacting with the Gemini API
import { GoogleGenAI } from "@google/genai";
// Import the Storage class for interacting with Google Cloud Storage
import { Storage } from "@google-cloud/storage";
// Import the config function to load environment variables from a .env file
import { config } from "dotenv";

// Load environment variables from the .env file
config();

// Initialize the Gemini API client with the API key from environment variables
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Initialize the Google Cloud Storage client
const storage = new Storage();
// Specify the name of the Cloud Storage bucket
const bucketName = "gsc-bucket-007";
// Get a reference to the specified bucket
const bucket = storage.bucket(bucketName);

// Define an asynchronous function to handle image generation requests
export const generateGeminiImage = async (req, res) => {
  const { userId, lessonId, prompt } = req.body; // Extract userId, lessonId, and prompt from the request body

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  const { imageUrl, imageFilename } = await getImage(userId, lessonId, prompt); // Call the getImage function to generate and store the image

  res.json({ imageUrl, imageFilename });
};

// Define an asynchronous function to generate an image using the Gemini API and store it in Google Cloud Storage
export const getImage = async (userId, lessonId, prompt) => {
  try {
    // Send a request to the Gemini API to generate an image based on the provided prompt
    const response = await ai.models.generateImages({
      model: "imagen-3.0-generate-002",
      prompt: prompt,
      config: {
        numberOfImages: 1, // Request only one image
      },
    });

    // Initialize variables to store the image filename and URL
    let imageFilename = null;
    let imageUrl = null;

    // Iterate over the generated images (should be only one in this case)
    for (const generatedImage of response.generatedImages) {
      // Extract the image bytes from the response
      let imgBytes = generatedImage.image.imageBytes;
      // Convert the base64 encoded image bytes to a Buffer
      const buffer = Buffer.from(imgBytes, "base64");

      // Generate a unique filename for the image in Cloud Storage using userId, lessonId, and a timestamp
      const timestamp = Date.now();
      const storageFilename = `${userId}/${lessonId}/gemini-image-${timestamp}.png`;
      // Get a reference to the file in the bucket
      const file = bucket.file(storageFilename);

      // Save the image buffer to Cloud Storage with appropriate metadata
      await file.save(buffer, {
        metadata: { contentType: "image/png" },
      });

      // Construct the public URL for the stored image
      imageUrl = `https://storage.googleapis.com/${bucketName}/${storageFilename}`;
      // Store the filename
      imageFilename = storageFilename;
      break;
    }

    // If no image URL was generated, throw an error
    if (!imageUrl) {
      throw new Error(
        "Failed to generate or store image " + JSON.stringify(response)
      );
    }

    return { imageUrl, imageFilename };
  } catch (error) { // Catch any errors that occur during the process
    console.error("Gemini API or Cloud Storage Error:", error);
    // Return an error message, either from the caught error or a generic message
    return error.message || "Unknown error occurred during image generation";
  }
};
