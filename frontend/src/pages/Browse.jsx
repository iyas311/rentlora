import { useSearchParams } from "react-router-dom";
import FilterSidebar from "../components/properties/FilterSidebar";
import PropertyGrid from "../components/properties/PropertyGrid";
import { useProperties } from "../hooks/useProperties";

export default function Browse() {
  const [params, setParams] = useSearchParams();
  const filters = Object.fromEntries(params.entries());
  
  const currentPage = parseInt(filters.page || "1", 10);
  const { data, isLoading } = useProperties({ ...filters, page: currentPage, limit: 6 });
  
  const handlePageChange = (newPage) => {
    const nextParams = new URLSearchParams(params);
    nextParams.set("page", newPage.toString());
    setParams(nextParams);
  };

  const handleFilterChange = (nextFilters) => {
    const nextParams = new URLSearchParams();
    Object.entries(nextFilters).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        if (key !== "page") {
          nextParams.set(key, val.toString());
        }
      }
    });
    nextParams.set("page", "1");
    setParams(nextParams);
  };

  const totalPages = data?.pages || 0;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[280px_1fr]">
      <FilterSidebar filters={filters} setFilters={handleFilterChange} clear={() => setParams({})} />
      <div className="space-y-6">
        <PropertyGrid data={data} loading={isLoading} />
        
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-4 border-t border-gray-100">
            <button
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(currentPage - 1)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Previous
            </button>
            <span className="text-sm font-medium text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
