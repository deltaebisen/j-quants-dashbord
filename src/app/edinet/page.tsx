import { Suspense } from "react";
import { format } from "date-fns";
import { getEdinetDocuments } from "@/lib/edinet-client";
import { EdinetPageClient } from "@/components/edinet/edinet-page-client";
import { Skeleton } from "@/components/ui/skeleton";
import type { EdinetDocument } from "@/lib/edinet-types";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EDINET 開示書類 - J-Quants ダッシュボード",
};

function EdinetSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-9" />
      </div>
      <Skeleton className="h-[600px] rounded-lg" />
    </div>
  );
}

async function EdinetContent() {
  const today = format(new Date(), "yyyy-MM-dd");
  let documents: EdinetDocument[];
  try {
    documents = await getEdinetDocuments(today);
  } catch {
    documents = [];
  }

  return <EdinetPageClient initialDocuments={documents} initialDate={today} />;
}

export default function EdinetPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">EDINET 開示書類</h1>
      <Suspense fallback={<EdinetSkeleton />}>
        <EdinetContent />
      </Suspense>
    </div>
  );
}
