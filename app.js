import express from "express";
import { config } from "dotenv";
import upload from "./Middlewares/multerConfig.js"
import { generateGeminiResponse } from "./Controllers/PromptController.js";
import { generateGeminiChat } from "./Controllers/ChatController.js";
import { generateGeminiSummary } from "./Controllers/ImageSummaryController.js";
import { generateGeminiImage } from "./Controllers/imageGeneratorController.js";

config();

const app = express();
const PORT = 8080;

app.use(express.json());

app.post("/prompt", generateGeminiResponse);
app.post("/chat", generateGeminiChat);
app.post("/image-summary", upload.single("image"), generateGeminiSummary);
app.post("/imagen",generateGeminiImage);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
