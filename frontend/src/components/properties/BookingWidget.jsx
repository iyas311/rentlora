import { useState } from "react";
import Button from "../ui/Button";
import Input from "../ui/Input";
import { calcNights } from "../../utils/dateUtils";
import { calcTotal, formatCurrency } from "../../utils/priceUtils";

export default function BookingWidget({ property, onBook }) {
  const [form, setForm] = useState({ check_in: "", check_out: "", guests_count: 1 });
  const nights = calcNights(form.check_in, form.check_out);
  return <div className="sticky top-24 rounded-lg bg-white p-4 shadow"><p className="text-xl font-semibold text-primary">{formatCurrency(property.price_per_night)}/night</p><div className="mt-3 space-y-2"><Input type="date" value={form.check_in} onChange={(e) => setForm({ ...form, check_in: e.target.value })} /><Input type="date" value={form.check_out} onChange={(e) => setForm({ ...form, check_out: e.target.value })} /><Input type="number" min={1} value={form.guests_count} onChange={(e) => setForm({ ...form, guests_count: Number(e.target.value) })} /></div><p className="mt-3 text-sm">Total: {formatCurrency(calcTotal(property.price_per_night, nights))}</p><Button className="mt-3 w-full" onClick={() => onBook(form)}>Book Now</Button></div>;
}
