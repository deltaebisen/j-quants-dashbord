import { Suspense } from "react";
import { MarketOverview } from "@/components/market/market-overview";
import { SectorOverview } from "@/components/market/sector-overview";
import { Skeleton } from "@/components/ui/skeleton";

function MarketSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-40 rounded-lg" />
      ))}
    </div>
  );
}

function SectorSkeleton() {
  return <Skeleton className="h-96 rounded-lg" />;
}

export default function Home() {
  return (
    <div className="container mx-auto space-y-8 px-4 py-8">
      <Suspense fallback={<MarketSkeleton />}>
        <MarketOverview />
      </Suspense>
      <Suspense fallback={<SectorSkeleton />}>
        <SectorOverview />
      </Suspense>
    </div>
  );
}
