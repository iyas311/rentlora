export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-slate-200 ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl bg-white border border-slate-100 overflow-hidden shadow-sm flex flex-col">
      <Skeleton className="w-full aspect-[4/3]" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-6 w-3/4 rounded-md" />
        <Skeleton className="h-4 w-1/2 rounded-md" />
        <Skeleton className="h-4 w-full rounded-md mt-4" />
      </div>
    </div>
  );
}

export function TextSkeleton({ className = "h-4 w-full rounded-md", lines = 1 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={className} />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-slate-200">
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
        <Skeleton className="h-4 w-1/3 rounded-md" />
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-6 py-4 flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/4 rounded-md" />
              <Skeleton className="h-3 w-1/6 rounded-md" />
            </div>
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
