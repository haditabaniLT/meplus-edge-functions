import { GoogleGenAI } from "npm:@google/genai";
import { generatePrompt } from "./prompts.ts";

const apiKey = (globalThis as any).Deno?.env?.get("GEMINI_API_KEY");

export interface AIResponse {
    data?: string;
    success: boolean;
    error?: string;
}

export const generateGeminiResponse = async (userPrompt: string, userInfor?: any, metadata?: any): Promise<AIResponse> => {
    if (!apiKey) {
        return {
            error: "Gemini API key not configured",
            success: false,
        };
    }

    try {
        const prompt = generatePrompt(userPrompt, userInfor, metadata);
        const ai = new GoogleGenAI({ apiKey });

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        const data = response.text;

        if (!data) {
            return {
                error: "No content generated from Gemini",
                success: false,
            };
        }

        return {
            data,
            success: true,
        };

    } catch (error: any) {
        return {
            error: error.message || "Gemini API error",
            success: false,
        };
    }
};
