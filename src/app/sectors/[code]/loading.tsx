import { Skeleton } from "@/components/ui/skeleton";

export default function SectorLoading() {
  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <Skeleton className="h-4 w-32" />
      <div className="rounded-lg border">
        <div className="p-6">
          <Skeleton className="mb-6 h-7 w-48" />
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
