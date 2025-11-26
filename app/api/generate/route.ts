import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { settlePayment, facilitator } from "thirdweb/x402";
import { createThirdwebClient } from "thirdweb";
import { monad } from "thirdweb/chains";

const client = createThirdwebClient({
  secretKey: process.env.THIRDWEB_SECRET_KEY!,
});

const thirdwebFacilitator = facilitator({
  client,
  serverWalletAddress: process.env.THIRDWEB_SERVER_WALLET_ADDRESS!,
});

const keywordsSchema = z.object({
  keywords: z
    .array(z.string())
    .min(1)
    .max(3)
    .describe("1-3 reaction keywords (emotions, gestures, expressions like 'facepalm', 'mind blown', 'celebration')"),
  topic: z
    .string()
    .nullable()
    .describe("Optional topic/context keyword (e.g. 'coding', 'coffee', 'monday') - only include if it would genuinely improve the GIF search, otherwise null"),
  reasoning: z
    .string()
    .describe("Brief explanation of why these keywords were chosen"),
});

const selectionSchema = z.object({
  selectedIndex: z
    .number()
    .int()
    .min(0)
    .describe("The index (0-based) of the best GIF from the list"),
  reasoning: z
    .string()
    .describe("Brief explanation of why this GIF was selected"),
});

export async function POST(request: Request) {
  try {
    // Step 0: Verify and settle payment
    const paymentResult = await settlePayment({
      resourceUrl: new URL("/api/generate", request.url).toString(),
      method: "POST",
      paymentData: request.headers.get("x-payment"),
      network: monad,
      price: "$0.01",
      facilitator: thirdwebFacilitator,
    });

    if (paymentResult.status !== 200) {
      // Payment required - return 402 response
      return Response.json(paymentResult.responseBody, {
        status: paymentResult.status,
        headers: paymentResult.responseHeaders,
      });
    }

    const { text } = await request.json();

    if (!text || typeof text !== "string") {
      return Response.json({ error: "Text input is required" }, { status: 400 });
    }

    // Step 1: Use AI to analyze the text and generate keywords
    const { object, usage } = await generateObject({
      model: openai("gpt-5-mini"),
      schema: keywordsSchema,
      prompt: `You are a reaction GIF expert. Analyze the following text and determine the perfect reaction GIF to respond with.

Text to analyze: "${text}"

Instructions:
1. Extract 1-3 REACTION keywords (emotions, gestures, expressions like "facepalm", "mind blown", "celebration", "cringe", "awkward")
2. Optionally extract a TOPIC keyword that contextualizes the reaction - but ONLY if:
   - The topic is specific and searchable (e.g. "coding", "coffee", "cat", "monday")
   - Including it would likely find a more relevant GIF
   - The topic is commonly used in GIF searches
   - Set to null if the reaction keywords alone are sufficient or if the topic is too generic/abstract

Examples:
- "when my code finally compiles" → keywords: ["relief", "celebration"], topic: "coding"
- "that feeling when you see your crush" → keywords: ["nervous", "excited"], topic: null (too generic)
- "me waiting for my coffee to brew" → keywords: ["waiting", "impatient"], topic: "coffee"
- "when someone says they don't like pizza" → keywords: ["shocked", "disgusted"], topic: null (reaction is enough)`,
    });

    console.log("Usage:", usage);

    // Step 2: Build search query - include topic only if provided
    const reactionKeywords = object.keywords.join(" ");
    const searchQuery = object.topic
      ? `${reactionKeywords} ${object.topic}`
      : reactionKeywords;

      console.log("Reaction keywords:", reactionKeywords);
      console.log("Topic:", object.topic);

    const giphyApiKey = process.env.GIPHY_API_KEY;

    if (!giphyApiKey) {
      return Response.json(
        { error: "Giphy API key not configured" },
        { status: 500 }
      );
    }

    // Step 3: Fetch 10 GIFs from Giphy
    const giphyResponse = await fetch(
      `https://api.giphy.com/v1/gifs/search?api_key=${giphyApiKey}&q=${encodeURIComponent(
        searchQuery
      )}&limit=10&rating=pg-13&lang=en`
    );

    if (!giphyResponse.ok) {
      return Response.json(
        { error: "Failed to fetch from Giphy" },
        { status: 500 }
      );
    }

    const giphyData = await giphyResponse.json();

    if (!giphyData.data || giphyData.data.length === 0) {
      return Response.json({ error: "No GIF found" }, { status: 404 });
    }

    const gifs = giphyData.data;

    // Step 4: Use AI to select the best GIF
    const gifOptions = gifs.map(
      (gif: { title: string; alt_text: string }, index: number) => ({
        index,
        title: gif.title,
        altText: gif.alt_text || "",
      })
    );

    const { object: selection } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: selectionSchema,
      prompt: `You are selecting the perfect reaction GIF for someone's message.

Original message: "${text}"

Here are the available GIFs:
${gifOptions
  .map((g: { index: number; title: string; altText: string }) => {
    const desc = g.altText ? ` - ${g.altText}` : "";
    return `${g.index}. "${g.title}"${desc}`;
  })
  .join("\n")}

Select the GIF that:
1. Best matches the emotional tone and context of the original message
2. Would be the funniest or most relatable reaction
3. Has clear, expressive content (use the alt text to understand what the GIF shows)

Return the index of the best GIF.`,
    });

    const selectedGif = gifs[selection.selectedIndex] || gifs[0];

    return Response.json({
      url: selectedGif.images.original.url,
      keywords: object.keywords,
      topic: object.topic,
      reasoning: selection.reasoning,
      title: selectedGif.title,
    });
  } catch (error) {
    console.error("Error generating GIF:", error);
    return Response.json(
      { error: "Failed to generate GIF recommendation" },
      { status: 500 }
    );
  }
}
