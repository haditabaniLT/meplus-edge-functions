import OpenAI from "npm:openai";
import { generatePrompt } from "./prompts.ts";

const apiKey = Deno.env.get("OPEN_AI_SECRET_KEY");

const client = new OpenAI({
    apiKey
});

export const generateOpenAiResponse = async (req: Request) => {

    try {

        const body = await req.json();
        const prompt = generatePrompt(body.prompt);

        const response = await client.responses.create({
            model: 'gpt-4o',
            instructions: 'You are a MePlus agent that helps ',
            input: prompt,
        });

        return {
            data: response.output_text,
            success: true,
        }

    } catch (error) {
        return {
            error: error.message,
            success: false,
        }
    }
};