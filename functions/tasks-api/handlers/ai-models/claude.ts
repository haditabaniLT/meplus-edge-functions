import OpenAI from "npm:openai";
import { generatePrompt } from "./prompts.ts";

const apiKey = (globalThis as any).Deno?.env?.get("CLAUDE_SECRET_KEY");

const client = apiKey ? new OpenAI({
    apiKey,
    baseURL: "https://api.anthropic.com/v1/",
}) : null;

export interface AIResponse {
    data?: string;
    success: boolean;
    error?: string;
}

export const generateClaudeResponse = async (userPrompt: string, userInfor?: any, metadata?: any): Promise<AIResponse> => {
    if (!client || !apiKey) {
        return {
            error: "Claude API key not configured",
            success: false,
        };
    }

    try {
        const prompt = generatePrompt(userPrompt, userInfor, metadata);

        const response = await client.chat.completions.create({
            messages: [
                { role: "user", content: prompt }
            ],
            model: "claude-sonnet-4-5",
        });

        const content = response.choices[0]?.message?.content;
        
        if (!content) {
            return {
                error: "No content generated from Claude",
                success: false,
            };
        }

        return {
            data: content,
            success: true,
        };

    } catch (error: any) {
        return {
            error: error.message || "Claude API error",
            success: false,
        };
    }
};
