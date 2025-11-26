# AGENTS.md - Next.js Project Guidelines

## Project Stack

- **Framework**: Next.js 16+ (App Router)
- **UI Library**: shadcn/ui
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript
- **Package Manager**: pnpm

---

## Server-Side Rendering First

### Default to Server Components

All components in the `app/` directory are **Server Components by default**. This is the preferred approach.

```tsx
// ✅ Server Component (default) - no directive needed
export default async function ProductPage({
  params,
}: {
  params: { id: string };
}) {
  const product = await fetchProduct(params.id);
  return <ProductDetails product={product} />;
}
```

### Use Client Components Sparingly

Only add `"use client"` when absolutely necessary:

- Event handlers (onClick, onChange, etc.)
- Browser APIs (localStorage, window, etc.)
- React hooks (useState, useEffect, useContext, etc.)
- Third-party client libraries

```tsx
"use client";
// ✅ Client Component - only when interactivity is required
import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount((c) => c + 1)}>{count}</button>;
}
```

### Component Composition Pattern

Keep client components small and push them to the leaves of your component tree:

```tsx
// ✅ Server Component parent with client component child
import { AddToCartButton } from "./add-to-cart-button"; // client component

export default async function ProductPage() {
  const product = await fetchProduct(); // Server-side fetch

  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <AddToCartButton productId={product.id} /> {/* Only this is client */}
    </div>
  );
}
```

---

## Data Fetching

### Server Components - Direct Async/Await

Fetch data directly in Server Components:

```tsx
// ✅ Direct fetch in Server Component
async function getUser(id: string) {
  const res = await fetch(`https://api.example.com/users/${id}`, {
    next: { revalidate: 3600 }, // Cache for 1 hour
  });
  return res.json();
}

export default async function UserProfile({
  params,
}: {
  params: { id: string };
}) {
  const user = await getUser(params.id);
  return <Profile user={user} />;
}
```

### Caching Strategies

```tsx
// Static data - cached indefinitely
fetch(url, { cache: "force-cache" });

// Revalidate every hour
fetch(url, { next: { revalidate: 3600 } });

// Dynamic data - no caching
fetch(url, { cache: "no-store" });
```

### Parallel Data Fetching

Use `Promise.all` for parallel requests:

```tsx
export default async function Dashboard() {
  const [user, posts, stats] = await Promise.all([
    getUser(),
    getPosts(),
    getStats()
  ])

  return (/* render with all data */)
}
```

---

## File Structure

```
app/
├── (auth)/                    # Route group (no URL impact)
│   ├── login/page.tsx
│   └── register/page.tsx
├── dashboard/
│   ├── page.tsx              # /dashboard
│   ├── loading.tsx           # Loading UI
│   ├── error.tsx             # Error boundary
│   └── layout.tsx            # Nested layout
├── api/                      # API routes
│   └── [route]/route.ts
├── globals.css
├── layout.tsx                # Root layout
└── page.tsx                  # Home page

components/
├── ui/                       # shadcn/ui components
│   ├── button.tsx
│   ├── card.tsx
│   └── ...
└── [feature]/                # Feature-specific components
    ├── feature-card.tsx
    └── feature-list.tsx

lib/
├── utils.ts                  # Utility functions (cn helper)
└── [feature].ts              # Feature-specific logic

hooks/                        # Custom React hooks (client-side)
└── use-[hook].ts

types/                        # TypeScript type definitions
└── index.ts
```

---

## shadcn/ui Best Practices

### Installation

```bash
pnpm dlx shadcn@latest add [component]
```

### Composition Over Configuration

shadcn components are meant to be customized. Copy and modify as needed:

```tsx
// components/ui/button.tsx - customize the variants
const buttonVariants = cva("inline-flex items-center justify-center...", {
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground...",
      destructive: "bg-destructive...",
      // Add custom variants here
      gradient: "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
    },
  },
});
```

### Server Component Compatibility

Most shadcn components work in Server Components. These require `"use client"`:

- Dialog, Sheet, Popover (interactive overlays)
- Dropdown Menu, Context Menu
- Tabs (with state)
- Form components with validation
- Toast/Sonner

```tsx
// ✅ Works in Server Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ❌ Requires "use client" in parent or wrapper
import { Dialog, DialogContent } from "@/components/ui/dialog";
```

---

## Tailwind CSS Guidelines

### Use CSS Variables for Theming

shadcn uses CSS variables. Define in `globals.css`:

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    /* ... */
  }
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    /* ... */
  }
}
```

### Utility-First Approach

```tsx
// ✅ Good - Tailwind utilities
<div className="flex items-center gap-4 rounded-lg bg-card p-6 shadow-sm">

// ❌ Avoid - inline styles
<div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
```

### Use the `cn()` Helper

Merge class names conditionally:

```tsx
import { cn } from "@/lib/utils";

<div
  className={cn(
    "rounded-lg p-4",
    isActive && "bg-primary text-primary-foreground",
    className
  )}
/>;
```

### Responsive Design

Mobile-first approach with breakpoint prefixes:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

---

## Performance Optimization

### Use `loading.tsx` for Streaming

```tsx
// app/dashboard/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
```

### Suspense Boundaries for Granular Loading

```tsx
import { Suspense } from "react";

export default function Page() {
  return (
    <div>
      <Header /> {/* Renders immediately */}
      <Suspense fallback={<ProductsSkeleton />}>
        <ProductList /> {/* Async component, streams when ready */}
      </Suspense>
      <Suspense fallback={<ReviewsSkeleton />}>
        <Reviews /> {/* Independent streaming */}
      </Suspense>
    </div>
  );
}
```

### Image Optimization

```tsx
import Image from "next/image";

<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  priority // For above-the-fold images
  className="object-cover"
/>;
```

### Dynamic Imports for Client Components

```tsx
import dynamic from "next/dynamic";

const HeavyChart = dynamic(() => import("./heavy-chart"), {
  loading: () => <ChartSkeleton />,
  ssr: false, // Skip SSR if component uses browser APIs
});
```

---

## API Routes

### Route Handlers

```tsx
// app/api/users/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const users = await db.user.findMany();
  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const body = await request.json();
  const user = await db.user.create({ data: body });
  return NextResponse.json(user, { status: 201 });
}
```

### Server Actions (Preferred for Mutations)

```tsx
// app/actions.ts
"use server";

import { revalidatePath } from "next/cache";

export async function createPost(formData: FormData) {
  const title = formData.get("title") as string;
  await db.post.create({ data: { title } });
  revalidatePath("/posts");
}
```

```tsx
// Usage in form
<form action={createPost}>
  <input name="title" />
  <Button type="submit">Create</Button>
</form>
```

---

## Error Handling

### Error Boundaries

```tsx
// app/dashboard/error.tsx
"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <h2 className="text-xl font-semibold">Something went wrong!</h2>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  );
}
```

### Not Found

```tsx
// app/not-found.tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <h2 className="text-2xl font-bold">Not Found</h2>
      <Link href="/" className="text-primary underline">
        Return Home
      </Link>
    </div>
  );
}
```

---

## TypeScript Conventions

### Strict Typing

```tsx
// ✅ Define explicit types
interface User {
  id: string;
  name: string;
  email: string;
}

async function getUser(id: string): Promise<User> {
  // ...
}
```

### Page Props Types

```tsx
// Next.js 15+ page props
interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Page({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { query } = await searchParams;
  // ...
}
```

---

## Environment Variables

```bash
# .env.local (never commit)
DATABASE_URL="..."
API_SECRET="..."

# Public variables (exposed to browser)
NEXT_PUBLIC_API_URL="..."
```

Access in code:

```tsx
// Server-side only
const secret = process.env.API_SECRET;

// Client-side (must have NEXT_PUBLIC_ prefix)
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

---

## Quick Reference

| Task              | Approach                           |
| ----------------- | ---------------------------------- |
| Data fetching     | Server Components with async/await |
| User interactions | Client Components (minimal)        |
| Forms             | Server Actions                     |
| API endpoints     | Route Handlers                     |
| Styling           | Tailwind utilities + cn()          |
| Loading states    | loading.tsx + Suspense             |
| Error handling    | error.tsx boundaries               |
| Images            | next/image with priority           |
| Links             | next/link with prefetch            |
