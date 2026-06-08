import { useState, useEffect } from "react";
import Input from "../ui/Input";
import Button from "../ui/Button";

export default function FilterSidebar({ filters, setFilters, clear }) {
  const [localFilters, setLocalFilters] = useState({
    city: filters.city || "",
    min_price: filters.min_price || "",
    max_price: filters.max_price || "",
    type: filters.type || "",
    guests: filters.guests || "",
    bedrooms: filters.bedrooms || "",
  });

  // Sync external filters (e.g. from home search or clear button) to local state
  useEffect(() => {
    setLocalFilters({
      city: filters.city || "",
      min_price: filters.min_price || "",
      max_price: filters.max_price || "",
      type: filters.type || "",
      guests: filters.guests || "",
      bedrooms: filters.bedrooms || "",
    });
  }, [
    filters.city,
    filters.min_price,
    filters.max_price,
    filters.type,
    filters.guests,
    filters.bedrooms
  ]);

  // Debounce local filter changes to parent state (updates URL/triggers API)
  useEffect(() => {
    const timer = setTimeout(() => {
      const changed = {};
      let hasChanged = false;

      Object.entries(localFilters).forEach(([key, val]) => {
        const parentVal = filters[key] || "";
        if (val.toString() !== parentVal.toString()) {
          changed[key] = val;
          hasChanged = true;
        }
      });

      if (hasChanged) {
        setFilters({ ...filters, ...changed });
      }
    }, 400); // 400ms debounce delay

    return () => clearTimeout(timer);
  }, [localFilters, filters, setFilters]);

  const handleChange = (field, value) => {
    setLocalFilters((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-5 rounded-lg bg-white p-4 shadow border border-gray-100 sticky top-24">
      <div className="flex items-center justify-between border-b pb-2 mb-2">
        <h3 className="font-bold text-primary text-lg">Filters</h3>
        <button onClick={clear} className="text-xs text-accent hover:underline font-semibold">
          Reset All
        </button>
      </div>

      {/* Destination / City */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Destination City</label>
        <Input
          placeholder="Where are you going?"
          value={localFilters.city}
          onChange={(e) => handleChange("city", e.target.value)}
        />
      </div>

      {/* Property Type Dropdown */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Property Type</label>
        <select
          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-accent text-gray-900 bg-white text-sm"
          value={localFilters.type}
          onChange={(e) => handleChange("type", e.target.value)}
        >
          <option value="">Any Type</option>
          <option value="apartment">Apartment</option>
          <option value="house">House</option>
          <option value="villa">Villa</option>
          <option value="studio">Studio</option>
        </select>
      </div>

      {/* Price Range */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Min Price</label>
          <Input
            type="number"
            placeholder="Min"
            value={localFilters.min_price}
            onChange={(e) => handleChange("min_price", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Max Price</label>
          <Input
            type="number"
            placeholder="Max"
            value={localFilters.max_price}
            onChange={(e) => handleChange("max_price", e.target.value)}
          />
        </div>
      </div>

      {/* Bedrooms Dropdown */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Min Bedrooms</label>
        <select
          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-accent text-gray-900 bg-white text-sm"
          value={localFilters.bedrooms}
          onChange={(e) => handleChange("bedrooms", e.target.value)}
        >
          <option value="">Any</option>
          <option value="1">1+ Bedroom</option>
          <option value="2">2+ Bedrooms</option>
          <option value="3">3+ Bedrooms</option>
          <option value="4">4+ Bedrooms</option>
        </select>
      </div>

      {/* Guests Dropdown */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Min Guests</label>
        <select
          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-accent text-gray-900 bg-white text-sm"
          value={localFilters.guests}
          onChange={(e) => handleChange("guests", e.target.value)}
        >
          <option value="">Any</option>
          <option value="1">1+ Guest</option>
          <option value="2">2+ Guests</option>
          <option value="4">4+ Guests</option>
          <option value="6">6+ Guests</option>
          <option value="8">8+ Guests</option>
        </select>
      </div>

      <Button variant="secondary" className="w-full mt-2" onClick={clear}>
        Clear Filters
      </Button>
    </div>
  );
}
