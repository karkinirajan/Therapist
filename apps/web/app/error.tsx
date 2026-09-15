"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col justify-center gap-4 px-4">
      <div className="max-w-2xl">
        <h2 className="text-xl font-bold text-foreground">Something went wrong!</h2>
        <p className="text-muted-foreground">{error.message || "An unexpected error occurred."}</p>
      </div>
      <div className="flex justify-start">
        <Button onClick={() => reset()}>Try again</Button>
      </div>
    </div>
  );
}
