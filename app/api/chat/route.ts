import { OpenAI } from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { AIProviders, Chat, Intention } from "@/types";
import { IntentionModule } from "@/modules/intention";
import { ResponseModule } from "@/modules/response";
import { PINECONE_INDEX_NAME } from "@/configuration/pinecone";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

// Get API keys
const pineconeApiKey = process.env.PINECONE_API_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;
const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
const fireworksApiKey = process.env.FIREWORKS_API_KEY;

// Check if API keys are set
if (!pineconeApiKey) {
  throw new Error("PINECONE_API_KEY is not set");
}
if (!openaiApiKey) {
  throw new Error("OPENAI_API_KEY is not set");
}

// Initialize Pinecone
const pineconeClient = new Pinecone({
  apiKey: pineconeApiKey,
});
const pineconeIndex = pineconeClient.Index(PINECONE_INDEX_NAME);

// Initialize Providers
const openaiClient = new OpenAI({
  apiKey: openaiApiKey,
});
const anthropicClient = new Anthropic({
  apiKey: anthropicApiKey,
});
const fireworksClient = new OpenAI({
  baseURL: "https://api.fireworks.ai/inference/v1",
  apiKey: fireworksApiKey,
});
const providers: AIProviders = {
  openai: openaiClient,
  anthropic: anthropicClient,
  fireworks: fireworksClient,
};

// Function to retrieve past chat history
async function getChatHistory(chat: Chat) {
  try {
    const pastMessages = await pineconeIndex.query({
      vector: chat.messages.slice(-1), // Get last message as context
      topK: 5, // Retrieve the 5 most relevant past messages
      includeMetadata: true, // Ensure metadata (text) is included
    });

    return pastMessages.matches.map((m) => m.metadata.text) || [];
  } catch (error) {
    console.error("Error retrieving chat history:", error);
    return []; // Return empty array if retrieval fails
  }
}

async function determineIntention(chat: Chat): Promise<Intention> {
  return await IntentionModule.detectIntention({
    chat: chat,
    openai: providers.openai,
  });
}

export async function POST(req: Request) {
  const { chat } = await req.json();

  // Retrieve past chat history and merge with current chat
  const chatHistory = await getChatHistory(chat);
  chat.messages = [...chatHistory, ...chat.messages];

  const intention: Intention = await determineIntention(chat);

  if (intention.type === "question") {
    return ResponseModule.respondToQuestion(chat, providers, pineconeIndex);
  } else if (intention.type === "hostile_message") {
    return ResponseModule.respondToHostileMessage(chat, providers);
  } else {
    return ResponseModule.respondToRandomMessage(chat, providers);
  }
}
