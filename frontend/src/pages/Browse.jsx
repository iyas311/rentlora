import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import FilterSidebar from "../components/properties/FilterSidebar";
import PropertyGrid from "../components/properties/PropertyGrid";
import { useProperties } from "../hooks/useProperties";
import { FiSearch, FiZap } from "react-icons/fi";

export default function Browse() {
  const [params, setParams] = useSearchParams();
  const filters = Object.fromEntries(params.entries());
  
  const [aiQuery, setAiQuery] = useState("");
  const [aiResult, setAiResult] = useState(null);

  const currentPage = parseInt(filters.page || "1", 10);
  
  // Normal DB search
  const { data: dbData, isLoading: isDbLoading } = useProperties({ ...filters, page: currentPage, limit: 6 }, {
    enabled: !aiResult // disable normal fetch if we have AI results
  });

  // AI Semantic Search
  const aiSearchMutation = useMutation({
    mutationFn: async (query) => {
      const res = await fetch("/api/search/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, limit: 6 })
      });
      if (!res.ok) throw new Error("AI search failed");
      return res.json();
    },
    onSuccess: (data) => {
      setAiResult(data);
    }
  });

  const handleAiSearch = (e) => {
    e.preventDefault();
    if (!aiQuery.trim()) {
      setAiResult(null);
      return;
    }
    aiSearchMutation.mutate(aiQuery);
  };
  
  const handlePageChange = (newPage) => {
    const nextParams = new URLSearchParams(params);
    nextParams.set("page", newPage.toString());
    setParams(nextParams);
  };

  const handleFilterChange = (nextFilters) => {
    setAiResult(null); // Clear AI results when using normal filters
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

  // Decide which data to show
  const currentData = aiResult ? { items: aiResult.properties, pages: 1 } : dbData;
  const isLoading = aiResult ? false : isDbLoading;
  const totalPages = currentData?.pages || 0;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[280px_1fr]">
      <FilterSidebar filters={filters} setFilters={handleFilterChange} clear={() => { setParams({}); setAiResult(null); setAiQuery(""); }} />
      <div className="space-y-6">
        
        {/* AI Search Bar */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 text-indigo-100 opacity-50">
            <FiZap size={120} />
          </div>
          <div className="relative z-10">
            <h2 className="text-lg font-bold text-indigo-900 mb-3 flex items-center">
              <FiZap className="mr-2 text-indigo-600 text-amber-500 fill-amber-500" /> AI Powered Search
            </h2>
            <form onSubmit={handleAiSearch} className="flex gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FiSearch className="text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Describe your ideal retreat (e.g., 'An exclusive beachfront villa with a private infinity pool' or 'A rustic mountain cabin')..."
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm outline-none transition"
                />
              </div>
              <button 
                type="submit" 
                disabled={aiSearchMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition shadow-md disabled:opacity-70 flex items-center gap-1.5"
              >
                {aiSearchMutation.isPending ? "Searching..." : "Search"}
              </button>
            </form>
            
            {/* AI Summary Result */}
            {aiResult && (
              <div className="mt-4 p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-indigo-100 text-indigo-900 shadow-sm">
                <p className="font-medium">{aiResult.summary}</p>
                <button 
                  onClick={() => { setAiResult(null); setAiQuery(""); }} 
                  className="text-xs text-indigo-500 mt-2 hover:text-indigo-700 underline"
                >
                  Clear AI results
                </button>
              </div>
            )}
          </div>
        </div>

        <PropertyGrid data={currentData} loading={isLoading} />
        
        {!isLoading && totalPages > 1 && !aiResult && (
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
