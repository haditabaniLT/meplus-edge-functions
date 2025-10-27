import OpenAI from "npm:openai";
import { generatePrompt } from "./prompts.ts";

const apiKey = Deno.env.get("CALUDE_SECRET_KEY");

const client = new OpenAI({
    apiKey,   // Your Claude API key
    baseURL: "https://api.anthropic.com/v1/",  // Claude API endpoint
});

export const generateClaudeResponse = async (req: Request) => {

    try {

        const body = await req.json();
        const prompt = generatePrompt(body.prompt);

        const response = await client.chat.completions.create({
            messages: [
                { role: "user", content: prompt }
            ],
            model: "claude-sonnet-4-5", // Claude model name
        });

        return {
            data: response.choices[0].message.content,
            success: true,
        }

    } catch (error) {
        return {
            error: error.message,
            success: false,
        }
    }
};