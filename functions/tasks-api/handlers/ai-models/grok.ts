import { createSuccessResponse } from "../../utils/authHelpers.ts";
import OpenAI from "npm:openai";
import { generatePrompt } from "./prompts.ts";

const apiKey = "RTtxN75NVloEkp7jktpDAp9qS";
const apiSecretKey = Deno.env.get("GROK_SECRET");

const client = new OpenAI({
    apiKey,
    baseURL: "https://api.x.ai/v1",

});

export const generateGrokResponse = async (req: Request) => {

    const body = await req.json();
    const prompt = generatePrompt(body.prompt);

    // const response = await client.chat.completions.create({
    //     model: "grok-4-0709",
    //     messages: [
    //         {
    //             role: "system",
    //             content: "You are Grok, a chatbot inspired by the Hitchhiker's Guide to the Galaxy."
    //         },
    //         {
    //             role: "user",
    //             content: "What is the meaning of life, the universe, and everything?"
    //         },
    //     ],
    //     temperature: 0,
    // });

    const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiSecretKey}`,
        },
        body: JSON.stringify({
            model: "grok-4-0709",
            messages: [
                {
                    role: "system",
                    content: "You are Grok, a chatbot inspired by the Hitchhiker's Guide to the Galaxy."
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
            temperature: 0,
        }),
    });

    const data = await response.json();

    console.log("======[data]=====", JSON.stringify(data, null, 1))


    // const response = await fetch("https://api.openai.com/v1/chat/completions", {
    //     method: "POST",
    //     headers: {
    //         "Content-Type": "application/json",
    //         "Authorization": `Bearer ${apiKey}`,
    //     },
    //     body: JSON.stringify({
    //         model: "gpt-4.1",
    //         messages: [
    //             {
    //                 role: "user",
    //                 content: prompt,
    //             },
    //         ],
    //         // response_format: { type: "json_object" },
    //     }),
    // });

    // const data = await response.data;
    // const content = data.choices[0].message.content;

    // console.log("======[data]=====", JSON.stringify(data, null, 1))

    // const output = { text: response.output_text };
    const output = { response: data };

    return createSuccessResponse(output, "Response generated successfully");
};