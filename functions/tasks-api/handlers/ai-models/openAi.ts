import OpenAI from "npm:openai";
import { generatePrompt } from "./prompts.ts";

const apiKey = (globalThis as any).Deno?.env?.get("OPEN_AI_SECRET_KEY");

const client = apiKey ? new OpenAI({
    apiKey
}) : null;

export interface AIResponse {
    data?: string;
    success: boolean;
    error?: string;
}

export const generateOpenAiResponse = async (userPrompt: string, userInfor?: any, metadata?: any): Promise<AIResponse> => {
    if (!client || !apiKey) {
        return {
            error: "OpenAI API key not configured",
            success: false,
        };
    }

    try {
        const prompt = generatePrompt(userPrompt, userInfor, metadata);

        const response = await client.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: "system", content: "You are a MePlus agent that helps professionals create actionable tasks." },
                { role: "user", content: prompt }
            ],
        });

        const content = response.choices[0]?.message?.content;

        if (!content) {
            return {
                error: "No content generated from OpenAI",
                success: false,
            };
        }

        return {
            data: content,
            success: true,
        };

    } catch (error: any) {
        return {
            error: error.message || "OpenAI API error",
            success: false,
        };
    }
};