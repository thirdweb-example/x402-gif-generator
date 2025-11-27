import { GifGenerator } from "@/components/gif-generator";
import { Logo } from "@/components/logo";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-16">
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-linear-to-br from-amber-500/10 via-orange-500/5 to-transparent blur-3xl" />
        <div className="absolute -bottom-1/4 right-0 h-[600px] w-[600px] rounded-full bg-linear-to-tl from-rose-500/10 via-purple-500/5 to-transparent blur-3xl" />
      </div>

      <main className="relative flex w-full max-w-4xl flex-col items-center gap-8">
        <div className="space-y-4 text-center">
          <div className="flex justify-center mb-6">
            <Logo size={72} />
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            <span className="bg-linear-to-r from-amber-400 via-orange-500 to-rose-500 bg-clip-text text-transparent">
              Reaction GIF
            </span>{" "}
            Generator
          </h1>
          <p className="text-lg text-muted-foreground">
            Describe any situation and get the perfect reaction GIF
          </p>
          <p className="text-sm text-muted-foreground/70">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-primary">
              $0.01 per generation
            </span>
          </p>
        </div>

        <GifGenerator />

        <footer className="pt-8 text-center text-xs text-muted-foreground/60">
          Powered by AI & Giphy
        </footer>
      </main>
    </div>
  );
}
