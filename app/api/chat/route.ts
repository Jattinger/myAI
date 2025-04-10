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

// Function to determine the user's intention
async function determineIntention(chat: Chat): Promise<Intention> {
  return await IntentionModule.detectIntention({
    chat: chat,
    openai: providers.openai,
  });
}

// Function to generate an embedding for a given text message
async function generateEmbedding(text: string): Promise<number[]> {
  const embeddingResponse = await providers.openai.embeddings.create({
    model: "text-embedding-ada-002", // OpenAI’s embedding model
    input: text,
  });

  return embeddingResponse.data[0].embedding; // Extract numerical vector
}

// Function to store chat history in Pinecone
async function storeMessageInPinecone(message: string) {
  try {
    const vector = await generateEmbedding(message);
    await pineconeIndex.upsert([
      {
        id: `msg-${Date.now()}`, // Unique ID for message
        values: vector,
        metadata: { text: message },
      },
    ]);
  } catch (error) {
    console.error("Error storing message in Pinecone:", error);
  }
}

// Main function to handle chat requests
export async function POST(req: Request) {
  const { chat } = await req.json();

  try {
    // Generate an embedding for the last message
    const lastMessage = chat.messages[chat.messages.length - 1].content;
    const lastMessageVector = await generateEmbedding(lastMessage);

    // Query Pinecone for past relevant messages
    const pastMessages = await pineconeIndex.query({
      vector: lastMessageVector, // Correct format for Pinecone
      topK: 5, // Retrieve the 5 most relevant past messages
      includeMetadata: true, // Ensure metadata (text) is included
    });

    // ✅ FIX: Ensure metadata is defined before accessing text
    const history = pastMessages.matches
      .map((m) => m.metadata?.text)
      .filter((text) => text !== undefined); // Remove undefined values

    chat.messages = [...history.map((text) => ({ role: "assistant", content: text })), ...chat.messages];

    // Store the latest message in Pinecone for future retrieval
    await storeMessageInPinecone(lastMessage);

    // Determine user intention and generate a response
    const intention: Intention = await determineIntention(chat);

    if (intention.type === "question") {
      return ResponseModule.respondToQuestion(chat, providers, pineconeIndex);
    } else if (intention.type === "hostile_message") {
      return ResponseModule.respondToHostileMessage(chat, providers);
    } else {
      return ResponseModule.respondToRandomMessage(chat, providers);
    }
  } catch (error) {
    console.error("Error processing chat request:", error);
    return ResponseModule.respondToRandomMessage(chat, providers); // Default fallback
  }
}
