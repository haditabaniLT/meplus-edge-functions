import { GoogleGenAI } from "npm:@google/genai";
import { generatePrompt } from "./prompts.ts";

const apiKey = Deno.env.get("GEMINI_API_KEY");


export const generateGeminiResponse = async (req: Request) => {

    const body = await req.json();
    const prompt = generatePrompt(body.prompt);

    try {

        const ai = new GoogleGenAI({ apiKey });

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        const data = response.text;

        return {
            data,
            success: true,
        };


    } catch (error) {

        return {
            error: error.message,
            success: false,
        };

    }
};