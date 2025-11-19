
import OpenAI from "npm:openai";
import { createSuccessResponse } from "../utils/authHelpers.ts";

const apiKey = Deno?.env?.get("OPEN_AI_SECRET_KEY");

const client = apiKey ? new OpenAI({
    apiKey
}) : null;

export interface AIResponse {
    data?: string;
    success: boolean;
    error?: string;
}

export const generateImprovedPrompt = async (prompt: string): Promise<any> => {
    try {
        const response = await client.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: "system", content: "You are a MePlus agent that helps professionals improve their prompts and only return the improved prompt no extra text or any extra details are prohibited." },
                { role: "user", content: prompt }
            ],
        });
        const content = response.choices[0]?.message?.content;
        return content
    } catch (error) {
        return {
            error: error.message,
            success: false,
        };
    }
}

export const generateImprovedPromptAPI = async (req: Request): Promise<any> => {
    try {
        const body = await req.json();
        const prompt = body.prompt;
        const content = await generateImprovedPrompt(prompt);
        return createSuccessResponse(content, "Prompt improved successfully");
    } catch (error) {
        return {
            error: error.message,
            success: false,
        };
    }
}