import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProperties } from "../hooks/useProperties";
import PropertyGrid from "../components/properties/PropertyGrid";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";

export default function Home() {
  const navigate = useNavigate();
  const [search, setSearch] = useState({ city: "", check_in: "", check_out: "", guests: 1 });
  const { data, isLoading } = useProperties({ page: 1, limit: 8 });
  return (
    <div className="space-y-8">
      <section className="rounded-xl bg-[url('https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1400')] bg-cover bg-center p-10 text-white shadow-md">
        <h1 className="text-4xl font-black mb-6 drop-shadow-md">Discover Premium Vacation Stays Worldwide</h1>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20">
          <div>
            <label className="block text-xs font-semibold text-white uppercase tracking-wider mb-1">City</label>
            <Input placeholder="Where to?" value={search.city} onChange={(e) => setSearch({ ...search, city: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white uppercase tracking-wider mb-1">Check-in</label>
            <Input type="date" value={search.check_in} onChange={(e) => setSearch({ ...search, check_in: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white uppercase tracking-wider mb-1">Check-out</label>
            <Input type="date" value={search.check_out} onChange={(e) => setSearch({ ...search, check_out: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white uppercase tracking-wider mb-1">Guests</label>
            <Input type="number" min={1} value={search.guests} onChange={(e) => setSearch({ ...search, guests: Number(e.target.value) })} />
          </div>
          <div className="flex items-end">
            <Button className="w-full h-10 mt-1 md:mt-0" onClick={() => navigate(`/browse?city=${search.city}&check_in=${search.check_in}&check_out=${search.check_out}&guests=${search.guests}`)}>Search</Button>
          </div>
        </div>
      </section>
      <section>
        <h2 className="mb-4 text-2xl font-semibold text-primary">Featured Properties</h2>
        <PropertyGrid data={data} loading={isLoading} />
      </section>
    </div>
  );
}
