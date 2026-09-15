import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-7xl flex-col justify-center gap-4 px-4 py-8">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          That page doesn&apos;t exist. Head back to the dashboard.
        </p>
      </div>
      <div className="flex justify-start">
        <Button asChild>
          <Link href="/">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
