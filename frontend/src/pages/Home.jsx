import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProperties } from "../hooks/useProperties";
import PropertyGrid from "../components/properties/PropertyGrid";
import { FiMapPin, FiCalendar, FiUsers, FiSearch, FiAward, FiZap, FiShield } from "react-icons/fi";


export default function Home() {
  const navigate = useNavigate();
  const [search, setSearch] = useState({ city: "", check_in: "", check_out: "", guests: 1 });
  const { data, isLoading } = useProperties({ page: 1, limit: 8 });

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    navigate(`/browse?city=${search.city}&check_in=${search.check_in}&check_out=${search.check_out}&guests=${search.guests}`);
  };

  return (
    <div className="space-y-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      
      {/* Hero Section */}
      <section className="relative rounded-3xl overflow-hidden shadow-xl min-h-[440px] flex items-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
        {/* Ambient Glow Effects */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-20 w-full p-8 sm:p-12 text-white space-y-8">
          <div className="space-y-3">
            <span className="inline-block text-xs uppercase font-bold tracking-widest text-indigo-400">Welcome to Rentlora</span>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight">
              Discover Premium <br />
              Vacation Stays Worldwide
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
              Bespoke luxury hospitality in handpicked cabins, beach houses, and boutique penthouses.
            </p>
          </div>

          {/* Search widget overlay (Glassmorphism 12-column grid) */}
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 bg-white/95 backdrop-blur-lg p-5 rounded-2xl border border-slate-100 shadow-2xl max-w-5xl">
            {/* City */}
            <div className="relative lg:col-span-3">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <FiMapPin className="text-slate-400" /> Location
              </label>
              <input 
                type="text" 
                placeholder="Where to?" 
                value={search.city} 
                onChange={(e) => setSearch({ ...search, city: e.target.value })}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 outline-none text-sm font-semibold text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition placeholder-slate-400"
              />
            </div>

            {/* Check-in */}
            <div className="relative lg:col-span-3">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <FiCalendar className="text-slate-400" /> Check-in
              </label>
              <input 
                type="date" 
                value={search.check_in} 
                onChange={(e) => setSearch({ ...search, check_in: e.target.value })}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 outline-none text-sm font-semibold text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
              />
            </div>

            {/* Check-out */}
            <div className="relative lg:col-span-3">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <FiCalendar className="text-slate-400" /> Check-out
              </label>
              <input 
                type="date" 
                value={search.check_out} 
                onChange={(e) => setSearch({ ...search, check_out: e.target.value })}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 outline-none text-sm font-semibold text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
              />
            </div>

            {/* Guests */}
            <div className="relative lg:col-span-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <FiUsers className="text-slate-400" /> Guests
              </label>
              <input 
                type="number" 
                min={1} 
                value={search.guests} 
                onChange={(e) => setSearch({ ...search, guests: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 outline-none text-sm font-semibold text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
              />
            </div>

            {/* Search Submit button */}
            <div className="flex items-end lg:col-span-2">
              <button 
                type="submit" 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 rounded-xl shadow-lg transition flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
              >
                <FiSearch size={18} />
                Search
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Value Propositions / Features Section */}
      <section className="py-4">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <span className="text-indigo-600 font-extrabold text-xs uppercase tracking-widest">Bespoke Hospitality</span>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">The Rentlora Standard</h2>
          <p className="text-slate-500 text-sm">Every booking includes curated properties, expert AI concierge access, and absolute trust.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Portfolio Card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4 hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FiAward size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-800">Vetted Collections</h3>
              <p className="text-slate-500 text-xs mt-2 leading-relaxed">
                Every property undergoes verification for premium aesthetics, layout, and comfort standards.
              </p>
            </div>
          </div>

          {/* AI Search Card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4 hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <FiZap size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-800">AI Powered Search</h3>
              <p className="text-slate-500 text-xs mt-2 leading-relaxed">
                Describe your dream stay in plain natural terms, and our search will fetch exact vector matches.
              </p>
            </div>
          </div>

          {/* Trust Shield Card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4 hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FiShield size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-800">Secured Reservations</h3>
              <p className="text-slate-500 text-xs mt-2 leading-relaxed">
                Get instant notifications, secure payouts, and round-the-clock support for peaceful stays.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Properties Section */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Featured Destinations</h2>
            <p className="text-slate-500 text-xs mt-1">Explore our standard-setting boutique villas, cabins, and suites.</p>
          </div>
        </div>
        
        <PropertyGrid data={data} loading={isLoading} />
      </section>

    </div>
  );
}
