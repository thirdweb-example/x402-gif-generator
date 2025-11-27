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

const perspectiveEnum = z.enum(["emotional", "literal", "sarcastic"]);

const strategiesSchema = z.object({
  strategies: z
    .array(
      z.object({
        keywords: z
          .array(z.string())
          .min(1)
          .max(3)
          .describe("1-3 search keywords for this perspective"),
        topic: z
          .string()
          .nullable()
          .describe("Optional topic/context keyword - only if it improves the search"),
        perspective: perspectiveEnum.describe("The perspective this strategy represents"),
        reasoning: z
          .string()
          .describe("Brief explanation of why these keywords were chosen for this perspective"),
      })
    )
    .length(3)
    .describe("Three different search strategies, one for each perspective"),
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

interface GiphyGif {
  title: string;
  alt_text?: string;
  images: {
    original: {
      url: string;
    };
  };
}

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
      return Response.json(paymentResult.responseBody, {
        status: paymentResult.status,
        headers: paymentResult.responseHeaders,
      });
    }

    const { text } = await request.json();

    if (!text || typeof text !== "string") {
      return Response.json({ error: "Text input is required" }, { status: 400 });
    }

    const giphyApiKey = process.env.GIPHY_API_KEY;
    if (!giphyApiKey) {
      return Response.json(
        { error: "Giphy API key not configured" },
        { status: 500 }
      );
    }

    // Step 1: Generate 3 different search strategies
    const { object: strategiesResult } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: strategiesSchema,
      prompt: `You are a reaction GIF expert. Analyze the following text and create 3 DIFFERENT search strategies to find reaction GIFs, each from a unique perspective.

Text to analyze: "${text}"

Create exactly 3 strategies:

1. EMOTIONAL perspective: Focus on the core emotion/feeling (e.g., "joy", "frustration", "relief", "cringe")
2. LITERAL perspective: Focus on the literal action or situation described (e.g., "waiting", "working late", "celebrating")
3. SARCASTIC perspective: Focus on ironic, sarcastic, or passive-aggressive reactions (e.g., "slow clap", "oh really", "sure jan", "cool story")

For each strategy:
- Extract 1-3 keywords that would work well as Giphy search terms
- Optionally include a topic if it would genuinely improve results (e.g., "coding", "coffee", "cat")
- Make sure each strategy produces DIFFERENT search queries

Examples for "when my code finally compiles after 3 hours":
- Emotional: keywords: ["relief", "exhausted"], topic: null
- Literal: keywords: ["coding", "success"], topic: "programmer"
- Sarcastic: keywords: ["slow clap", "finally"], topic: null`,
    });

    console.log("Generated strategies:", JSON.stringify(strategiesResult.strategies, null, 2));

    // Step 2: Execute parallel Giphy searches for each strategy
    const searchPromises = strategiesResult.strategies.map(async (strategy) => {
      const searchQuery = strategy.topic
        ? `${strategy.keywords.join(" ")} ${strategy.topic}`
        : strategy.keywords.join(" ");

      console.log(`Searching for ${strategy.perspective}: "${searchQuery}"`);

      const response = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${giphyApiKey}&q=${encodeURIComponent(
          searchQuery
        )}&limit=5&rating=pg-13&lang=en`
      );

      if (!response.ok) {
        return { strategy, gifs: [] };
      }

      const data = await response.json();
      return { strategy, gifs: data.data || [] };
    });

    const searchResults = await Promise.all(searchPromises);

    // Step 3: Select the best GIF from each search result
    const selectionPromises = searchResults.map(async ({ strategy, gifs }) => {
      if (gifs.length === 0) {
        return null;
      }

      const gifOptions = gifs.map((gif: GiphyGif, index: number) => ({
        index,
        title: gif.title,
        altText: gif.alt_text || "",
      }));

      const { object: selection } = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: selectionSchema,
        prompt: `You are selecting the best ${strategy.perspective} reaction GIF for someone's message.

Original message: "${text}"
Perspective: ${strategy.perspective.toUpperCase()} - ${
          strategy.perspective === "emotional"
            ? "focusing on the core emotion"
            : strategy.perspective === "literal"
            ? "focusing on the literal situation"
            : "focusing on sarcasm and irony"
        }

Here are the available GIFs:
${gifOptions
  .map((g: { index: number; title: string; altText: string }) => {
    const desc = g.altText ? ` - ${g.altText}` : "";
    return `${g.index}. "${g.title}"${desc}`;
  })
  .join("\n")}

Select the GIF that best represents the ${strategy.perspective} perspective on this message.`,
      });

      const selectedGif = gifs[selection.selectedIndex] || gifs[0];

      return {
        url: selectedGif.images.original.url,
        keywords: strategy.keywords,
        topic: strategy.topic,
        reasoning: selection.reasoning,
        title: selectedGif.title,
        perspective: strategy.perspective,
      };
    });

    const selections = await Promise.all(selectionPromises);
    const validGifs = selections.filter((s) => s !== null);

    if (validGifs.length === 0) {
      return Response.json({ error: "No GIFs found" }, { status: 404 });
    }

    return Response.json({ gifs: validGifs });
  } catch (error) {
    console.error("Error generating GIF:", error);
    return Response.json(
      { error: "Failed to generate GIF recommendation" },
      { status: 500 }
    );
  }
}
