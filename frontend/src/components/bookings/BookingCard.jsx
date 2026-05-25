import Badge from "../ui/Badge";
import Button from "../ui/Button";
import { formatDate } from "../../utils/dateUtils";
import { formatCurrency } from "../../utils/priceUtils";

export default function BookingCard({ booking, onCancel, onReview }) {
  return <div className="rounded-lg bg-white p-4 shadow"><div className="flex items-center justify-between"><h4 className="font-semibold">{booking.property.title}</h4><Badge status={booking.status} /></div><p className="text-sm text-muted">{formatDate(booking.check_in)} - {formatDate(booking.check_out)}</p><p>{formatCurrency(booking.total_price)}</p><div className="mt-3 flex gap-2">{booking.status === "confirmed" && <Button variant="secondary" onClick={() => onCancel?.(booking.id)}>Cancel</Button>}{booking.status === "completed" && <Button onClick={() => onReview?.(booking)}>Leave Review</Button>}</div></div>;
}
