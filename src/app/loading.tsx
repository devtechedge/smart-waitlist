import { Skeleton } from "@/components/ui/skeleton";

/**
 * Root loading state
 * ------------------
 * Shown at the root level when a top-level navigation is pending and no
 * more specific `loading.tsx` (e.g. `/dashboard/loading.tsx`) applies.
 * Kept minimal so it doesn't compete with the segment-specific skeletons.
 */
export default function Loading() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="size-12 rounded-full" />
        <div className="space-y-2 text-center">
          <Skeleton className="mx-auto h-5 w-32" />
          <Skeleton className="mx-auto h-3 w-48" />
        </div>
      </div>
    </main>
  );
}
