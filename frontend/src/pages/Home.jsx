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
  return <div className="space-y-8"><section className="rounded-xl bg-[url('https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1400')] bg-cover bg-center p-10 text-white"><h1 className="text-4xl font-bold">Find your perfect rental</h1><div className="mt-6 grid grid-cols-1 gap-2 md:grid-cols-5"><Input placeholder="City" value={search.city} onChange={(e) => setSearch({ ...search, city: e.target.value })} /><Input type="date" value={search.check_in} onChange={(e) => setSearch({ ...search, check_in: e.target.value })} /><Input type="date" value={search.check_out} onChange={(e) => setSearch({ ...search, check_out: e.target.value })} /><Input type="number" min={1} value={search.guests} onChange={(e) => setSearch({ ...search, guests: Number(e.target.value) })} /><Button onClick={() => navigate(`/browse?city=${search.city}&check_in=${search.check_in}&check_out=${search.check_out}&guests=${search.guests}`)}>Search</Button></div></section><section><h2 className="mb-4 text-2xl font-semibold">Featured Properties</h2><PropertyGrid data={data} loading={isLoading} /></section></div>;
}
