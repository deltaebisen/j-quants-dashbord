"use client";

import { useEffect, useState } from "react";
import type { FloatingSharesData } from "@/lib/edinet-shareholders-types";

// Module-level dedup: prevent multiple components from making the same request
const inflight = new Map<string, Promise<FloatingSharesData | null>>();

async function fetchFloatingShares(
  code: string
): Promise<FloatingSharesData | null> {
  const existing = inflight.get(code);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const res = await fetch(`/api/edinet/shareholders?code=${code}`);
      if (!res.ok) return null;
      return (await res.json()) as FloatingSharesData;
    } catch {
      return null;
    } finally {
      // Remove from inflight after a short delay to allow concurrent mounts
      setTimeout(() => inflight.delete(code), 100);
    }
  })();

  inflight.set(code, promise);
  return promise;
}

export function useFloatingShares(code: string) {
  const [data, setData] = useState<FloatingSharesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    fetchFloatingShares(code).then((result) => {
      if (!cancelled) {
        setData(result);
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [code]);

  return { data, isLoading };
}
