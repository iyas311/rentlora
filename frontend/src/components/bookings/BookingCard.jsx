import { FiMapPin, FiCalendar, FiUsers } from "react-icons/fi";
import { formatDate } from "../../utils/dateUtils";
import { formatCurrency } from "../../utils/priceUtils";

export default function BookingCard({ booking, onCancel, onReview }) {
  const isConfirmed = booking.status?.toLowerCase() === "confirmed";
  const isCompleted = booking.status?.toLowerCase() === "completed";
  const isCancelled = booking.status?.toLowerCase() === "cancelled" || booking.status?.toLowerCase() === "canceled";

  const getStatusBadge = (status) => {
    const s = status?.toLowerCase();
    if (s === "confirmed") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
          Confirmed
        </span>
      );
    } else if (s === "pending") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
          Pending
        </span>
      );
    } else if (s === "completed") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
          Completed
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
          Cancelled
        </span>
      );
    }
  };

  const firstImage = booking.property.first_image || "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800";

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden flex flex-col sm:flex-row hover:shadow-md hover:border-slate-200 transition duration-200 group">
      {/* Property Image Thumbnail */}
      <div className="w-full sm:w-44 h-44 sm:h-auto relative overflow-hidden flex-shrink-0">
        <img
          src={firstImage}
          alt={booking.property.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-3 left-3">
          {getStatusBadge(booking.status)}
        </div>
      </div>

      {/* Details Area */}
      <div className="p-5 flex-1 flex flex-col justify-between min-w-0">
        <div className="space-y-2">
          <div>
            <h4 className="font-bold text-slate-800 text-base truncate group-hover:text-indigo-600 transition-colors">
              {booking.property.title}
            </h4>
            <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
              <FiMapPin />
              <span>{booking.property.city}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-b border-slate-50 py-3 mt-3 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <FiCalendar className="text-slate-400" />
              <span>{formatDate(booking.check_in)} – {formatDate(booking.check_out)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FiUsers className="text-slate-400" />
              <span>{booking.guests_count} Guests</span>
            </div>
          </div>
        </div>

        {/* Pricing and Actions Row */}
        <div className="flex items-center justify-between mt-4 border-t border-slate-50/50 pt-3">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Total Paid</span>
            <span className="text-lg font-black text-slate-900">{formatCurrency(booking.total_price)}</span>
          </div>

          <div className="flex gap-2">
            {isConfirmed && (
              <button
                onClick={() => onCancel?.(booking.id)}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-100 hover:border-rose-200 px-3.5 py-2 rounded-xl transition"
              >
                Cancel Stay
              </button>
            )}
            {isCompleted && (
              <button
                onClick={() => onReview?.(booking)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 hover:border-indigo-200 px-3.5 py-2 rounded-xl transition"
              >
                Leave Review
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
