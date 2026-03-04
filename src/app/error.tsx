"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          <h2 className="text-xl font-bold">エラーが発生しました</h2>
          <p className="mt-2 text-muted-foreground">
            {error.message || "データの取得中にエラーが発生しました。"}
          </p>
          <Button className="mt-4" onClick={reset}>
            再試行
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
