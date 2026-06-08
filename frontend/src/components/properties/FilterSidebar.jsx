import Input from "../ui/Input";
import Button from "../ui/Button";
export default function FilterSidebar({ filters, setFilters, clear }) {
  return (
    <div className="space-y-4 rounded-lg bg-white p-4 shadow border border-gray-100">
      <h3 className="font-semibold text-primary text-lg border-b pb-2 mb-2">Filters</h3>
      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">City</label>
        <Input placeholder="e.g. Paris" value={filters.city || ""} onChange={(e) => setFilters({ ...filters, city: e.target.value })} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Min Price</label>
        <Input type="number" placeholder="Min Price" value={filters.min_price || ""} onChange={(e) => setFilters({ ...filters, min_price: e.target.value })} />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Max Price</label>
        <Input type="number" placeholder="Max Price" value={filters.max_price || ""} onChange={(e) => setFilters({ ...filters, max_price: e.target.value })} />
      </div>
      <Button variant="secondary" className="w-full mt-2" onClick={clear}>Clear Filters</Button>
    </div>
  );
}
