"use client";

import { useState, useEffect, useCallback } from "react";
import type { EdinetDocument } from "@/lib/edinet-types";

export function useEdinetDocuments(date: string) {
  const [documents, setDocuments] = useState<EdinetDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/edinet/documents?date=${date}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      } else {
        setDocuments([]);
      }
    } catch {
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return { documents, isLoading };
}
