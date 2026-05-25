import { OpenAI } from "openai";

const client = new OpenAI({
	baseURL: "https://router.huggingface.co/v1",
	apiKey: process.env.HUGGINGFACE_API_KEY,
});

console.log("Fetching...");

const chatCompletion = await client.chat.completions.create({
    model: "meta-llama/Llama-3.1-8B-Instruct:novita",
    messages: [
        {
            role: "user",
            content: "What is the capital of France?",
        },
    ],
});

console.log("Fetching Completed...");

console.log(chatCompletion.choices[0].message);