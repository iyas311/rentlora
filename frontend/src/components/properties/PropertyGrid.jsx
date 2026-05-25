import PropertyCard from "./PropertyCard";
import Skeleton from "../ui/Skeleton";

export default function PropertyGrid({ data, loading }) {
  if (loading) return <div className="grid grid-cols-1 gap-4 md:grid-cols-3">{Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-72" />)}</div>;
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-3">{data?.items?.map((p) => <PropertyCard key={p.id} property={p} />)}</div>;
}
