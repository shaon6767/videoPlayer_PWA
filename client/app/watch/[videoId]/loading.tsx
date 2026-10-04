import { Skeleton } from "@/components/ui/skeleton";

export default function WatchLoading() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Skeleton className="aspect-video w-full rounded-xl" />
        <Skeleton className="mt-4 h-6 w-2/3" />
      </div>
      <Skeleton className="aspect-video w-full rounded-lg" />
    </div>
  );
}
