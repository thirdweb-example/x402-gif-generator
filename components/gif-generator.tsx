"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Download, Sparkles } from "lucide-react";
import {
  useActiveAccount,
  useAutoConnect,
  useFetchWithPayment,
  useWalletBalance,
  useInvalidateBalances,
} from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";
import { monad } from "thirdweb/chains";

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

const usdcAddress = "0x754704Bc059F8C67012fEd69BC8A327a5aafb603";

type Perspective = "emotional" | "literal" | "sarcastic";

interface GifResult {
  url: string;
  keywords: string[];
  topic: string | null;
  reasoning: string;
  title: string;
  perspective: Perspective;
}

interface ApiResponse {
  gifs: GifResult[];
}

const perspectiveLabels: Record<Perspective, { label: string; color: string }> = {
  emotional: { label: "Emotional", color: "bg-rose-500/10 text-rose-600 border-rose-500/30" },
  literal: { label: "Literal", color: "bg-sky-500/10 text-sky-600 border-sky-500/30" },
  sarcastic: { label: "Sarcastic", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
};

export function GifGenerator() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState<GifResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { isLoading: isAutoConnecting } = useAutoConnect({ client });
  const account = useActiveAccount();
  const { data: balance } = useWalletBalance({
    client,
    address: account?.address,
    chain: monad,
    tokenAddress: usdcAddress,
  });
  const invalidateBalances = useInvalidateBalances();
  const { fetchWithPayment, isPending } = useFetchWithPayment(client);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isPending) return;

    setError(null);
    setResults([]);

    try {
      const data = await fetchWithPayment("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input }),
      });

      invalidateBalances({ chainId: monad.id });
      setResults((data as ApiResponse).gifs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const handleDownload = async (gif: GifResult) => {
    try {
      const response = await fetch(gif.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const uniqueId = crypto.randomUUID().slice(0, 8);
      a.download = `reaction-${gif.perspective}-${uniqueId}.gif`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      window.open(gif.url, "_blank");
    }
  };

  return (
    <div className="w-full max-w-6xl space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-center justify-center gap-4">
          <p className="text-sm text-muted-foreground">
            Your balance: ${balance?.displayValue || "--.--"}
          </p>
        </div>
        <div className="flex flex-col items-center justify-center gap-4">
        <form onSubmit={handleSubmit} className="flex gap-3 w-full max-w-xl mx-auto">
          <Input
            type="text"
            placeholder="Describe a situation or feeling..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isPending}
            className="h-12 text-base"
          />
          <Button
            type="submit"
            disabled={isPending || !input.trim() || isAutoConnecting}
            className="h-12 px-6"
          >
            {isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Sparkles className="h-5 w-5" />
            )}
          </Button>
        </form>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="py-4 text-center text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      {isPending && (
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <div className="relative">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-muted border-t-primary" />
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">
            Finding 3 perfect reactions...
          </p>
        </div>
      )}

      {results.length > 0 && !isPending && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {results.map((gif, index) => {
            const perspectiveStyle = perspectiveLabels[gif.perspective];
            return (
              <Card
                key={`${gif.perspective}-${index}`}
                className="overflow-hidden flex flex-col"
              >
                <img
                  src={gif.url}
                  alt={gif.title}
                  className="w-full aspect-square object-cover"
                />
                <CardContent className="p-3 flex flex-col gap-2 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${perspectiveStyle.color}`}
                    >
                      {perspectiveStyle.label}
                    </span>
                    {gif.keywords.map((keyword) => (
                      <span
                        key={keyword}
                        className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                      >
                        {keyword}
                      </span>
                    ))}
                    {gif.topic && (
                      <span className="rounded-full border border-muted-foreground/30 px-2 py-0.5 text-xs text-muted-foreground">
                        {gif.topic}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground italic flex-1">
                    {gif.reasoning}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(gif)}
                    className="w-full mt-auto"
                  >
                    <Download className="mr-2 h-3 w-3" />
                    Download
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
