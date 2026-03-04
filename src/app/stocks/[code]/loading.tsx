import { Skeleton } from "@/components/ui/skeleton";

export default function StockLoading() {
  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-24" />
      </div>
      <Skeleton className="h-24 rounded-lg" />
      <Skeleton className="h-[400px] rounded-lg" />
      <Skeleton className="h-[150px] rounded-lg" />
    </div>
  );
}
