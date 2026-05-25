import Input from "../ui/Input";
import Button from "../ui/Button";
export default function FilterSidebar({ filters, setFilters, clear }) {
  return <div className="space-y-3 rounded-lg bg-white p-4 shadow"><Input placeholder="City" value={filters.city || ""} onChange={(e) => setFilters({ ...filters, city: e.target.value })} /><Input type="number" placeholder="Min Price" value={filters.min_price || ""} onChange={(e) => setFilters({ ...filters, min_price: e.target.value })} /><Input type="number" placeholder="Max Price" value={filters.max_price || ""} onChange={(e) => setFilters({ ...filters, max_price: e.target.value })} /><Button variant="secondary" onClick={clear}>Clear filters</Button></div>;
}
