"use client";

import { useState, useEffect, useCallback } from "react";
import { format, subDays } from "date-fns";
import type { DailyPrice } from "@/lib/jquants-types";

export function useStockPrices(code: string, days: number) {
  const [prices, setPrices] = useState<DailyPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPrices = useCallback(async () => {
    setIsLoading(true);
    try {
      const to = format(new Date(), "yyyyMMdd");
      const from = format(subDays(new Date(), days), "yyyyMMdd");
      const res = await fetch(
        `/api/jquants/equities/bars/daily?code=${code}&from=${from}&to=${to}`
      );
      if (res.ok) {
        const data = await res.json();
        setPrices(data);
      }
    } catch {
      setPrices([]);
    } finally {
      setIsLoading(false);
    }
  }, [code, days]);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  return { prices, isLoading };
}
