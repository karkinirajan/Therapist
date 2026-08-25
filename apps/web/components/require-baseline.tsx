import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function RequireBaselineNotice() {
  return (
    <Card className="mx-auto max-w-md">
      <CardHeader className="items-center text-center">
        <ClipboardList className="mb-2 size-8 text-primary" />
        <CardTitle>Start with the intake</CardTitle>
        <CardDescription>
          This tool builds your baseline and 6-month roadmap from a short first-session intake.
          It only runs once — do that first, then this page unlocks.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Button asChild>
          <Link href="/intake">Start intake</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
