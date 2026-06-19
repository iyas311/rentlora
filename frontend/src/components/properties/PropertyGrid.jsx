import PropertyCard from "./PropertyCard";
import { CardSkeleton } from "../ui/Skeleton";

export default function PropertyGrid({ data, loading }) {
  if (loading) return <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}</div>;
  
  if (!data?.items || data.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300 min-h-80">
        <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <p className="text-lg font-medium text-gray-700">No properties found</p>
        <p className="text-sm text-gray-500 mt-1">Try adjusting your filters or search terms to find available rentals.</p>
      </div>
    );
  }
  
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-3">{data?.items?.map((p) => <PropertyCard key={p.id} property={p} />)}</div>;
}
