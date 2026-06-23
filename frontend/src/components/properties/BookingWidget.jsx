import { useState } from "react";
import { calcNights } from "../../utils/dateUtils";
import { calcTotal, formatCurrency } from "../../utils/priceUtils";

export default function BookingWidget({ property, onBook }) {
  const [form, setForm] = useState({ check_in: "", check_out: "", guests_count: 1 });
  const nights = calcNights(form.check_in, form.check_out);
  const total = calcTotal(property.price_per_night, nights);

  return (
    <div className="rounded-2xl bg-white p-6 shadow-xl shadow-slate-200/40 border border-slate-100">
      <div className="mb-6 flex items-baseline gap-1">
        <span className="text-3xl font-black text-slate-900">{formatCurrency(property.price_per_night)}</span>
        <span className="text-sm font-semibold text-slate-500">/ night</span>
      </div>

      <div className="space-y-4">
        {/* Date Inputs Container */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Check-in</label>
            <input 
              type="date" 
              value={form.check_in} 
              onChange={(e) => setForm({ ...form, check_in: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Check-out</label>
            <input 
              type="date" 
              value={form.check_out} 
              onChange={(e) => setForm({ ...form, check_out: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition"
            />
          </div>
        </div>

        {/* Guests Input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Guests</label>
          <input 
            type="number" 
            min={1} 
            max={property.max_guests} 
            value={form.guests_count} 
            onChange={(e) => setForm({ ...form, guests_count: Number(e.target.value) })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition"
          />
        </div>
      </div>

      {/* Pricing Summary */}
      <div className="mt-6 pt-4 border-t border-slate-100">
        <div className="flex justify-between items-center mb-4">
          <span className="text-slate-600 font-medium underline decoration-slate-300 underline-offset-4">
            {formatCurrency(property.price_per_night)} x {nights} night{nights !== 1 ? "s" : ""}
          </span>
          <span className="text-slate-900 font-semibold">{formatCurrency(total)}</span>
        </div>
        <div className="flex justify-between items-center pt-4 border-t border-slate-100">
          <span className="text-lg font-black text-slate-900">Total</span>
          <span className="text-xl font-black text-indigo-600">{formatCurrency(total)}</span>
        </div>
      </div>

      <button 
        onClick={() => onBook(form)}
        className="mt-6 w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 text-lg shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 active:translate-y-0"
      >
        Reserve Now
      </button>
      <p className="text-center text-xs text-slate-400 font-medium mt-3">You won&apos;t be charged yet</p>
    </div>
  );
}
