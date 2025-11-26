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
  useInvalidateBalances
} from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";
import { monad } from "thirdweb/chains";

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

const usdcAddress = "0x754704Bc059F8C67012fEd69BC8A327a5aafb603";

interface GifResult {
  url: string;
  keywords: string[];
  topic: string | null;
  reasoning: string;
  title: string;
}

export function GifGenerator() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<GifResult | null>(null);
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
    setResult(null);

    try {
      const data = await fetchWithPayment("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input }),
      });

      invalidateBalances({ chainId: monad.id });
      setResult(data as GifResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const handleDownload = async () => {
    if (!result?.url) return;

    try {
      const response = await fetch(result.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reaction-${Date.now()}.gif`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in new tab
      window.open(result.url, "_blank");
    }
  };

  return (
    <div className="w-full max-w-xl space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-center justify-center gap-4">
          <p className="text-sm text-muted-foreground">
            Your balance: ${balance?.displayValue || "--.--"}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex gap-3">
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
            Finding the perfect reaction...
          </p>
        </div>
      )}

      {result && !isPending && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <img src={result.url} alt={result.title} className="w-full" />
            </CardContent>
          </Card>

          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {result.keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                >
                  {keyword}
                </span>
              ))}
              {result.topic && (
                <span className="rounded-full border border-muted-foreground/30 px-3 py-1 text-xs text-muted-foreground">
                  {result.topic}
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="shrink-0"
            >
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>

          <p className="text-sm text-muted-foreground italic">
            {result.reasoning}
          </p>
        </div>
      )}
    </div>
  );
}
