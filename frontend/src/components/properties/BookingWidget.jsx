import { useState } from "react";
import Button from "../ui/Button";
import Input from "../ui/Input";
import { calcNights } from "../../utils/dateUtils";
import { calcTotal, formatCurrency } from "../../utils/priceUtils";

export default function BookingWidget({ property, onBook }) {
  const [form, setForm] = useState({ check_in: "", check_out: "", guests_count: 1 });
  const nights = calcNights(form.check_in, form.check_out);
  return (
    <div className="sticky top-24 rounded-lg bg-white p-4 shadow-lg border border-gray-100">
      <p className="text-2xl font-bold text-primary">{formatCurrency(property.price_per_night)}<span className="text-sm font-normal text-muted"> / night</span></p>
      <div className="mt-4 space-y-3">
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Check-in Date</label>
          <Input type="date" value={form.check_in} onChange={(e) => setForm({ ...form, check_in: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Check-out Date</label>
          <Input type="date" value={form.check_out} onChange={(e) => setForm({ ...form, check_out: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Number of Guests</label>
          <Input type="number" min={1} max={property.max_guests} value={form.guests_count} onChange={(e) => setForm({ ...form, guests_count: Number(e.target.value) })} />
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">Total ({nights} night{nights !== 1 ? "s" : ""})</span>
        <span className="text-lg font-bold text-primary">{formatCurrency(calcTotal(property.price_per_night, nights))}</span>
      </div>
      <Button className="mt-4 w-full" onClick={() => onBook(form)}>Book Now</Button>
    </div>
  );
}
