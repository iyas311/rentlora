import { useSearchParams } from "react-router-dom";
import FilterSidebar from "../components/properties/FilterSidebar";
import PropertyGrid from "../components/properties/PropertyGrid";
import { useProperties } from "../hooks/useProperties";

export default function Browse() {
  const [params, setParams] = useSearchParams();
  const filters = Object.fromEntries(params.entries());
  const { data, isLoading } = useProperties(filters);
  return <div className="grid grid-cols-1 gap-6 md:grid-cols-[280px_1fr]"><FilterSidebar filters={filters} setFilters={(next) => setParams(next)} clear={() => setParams({})} /><PropertyGrid data={data} loading={isLoading} /></div>;
}
