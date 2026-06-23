import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { cancelBooking } from "../api/bookings";
import { createReview } from "../api/reviews";
import BookingCard from "../components/bookings/BookingCard";
import ReviewForm from "../components/reviews/ReviewForm";
import { notifyError, notifySuccess } from "../components/ui/Toast";
import { useBookings } from "../hooks/useBookings";
import { FiCalendar, FiCompass, FiX } from "react-icons/fi";
import { CardSkeleton } from "../components/ui/Skeleton";

export default function MyBookings() {
  const [tab, setTab] = useState("all");
  const [reviewBooking, setReviewBooking] = useState(null);
  const { data: bookings, isLoading } = useBookings(tab);
  const qc = useQueryClient();

  const reviewMutation = useMutation({
    mutationFn: createReview,
    onSuccess: () => {
      notifySuccess("Thank you! Your review has been submitted.");
      setReviewBooking(null);
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: (e) => {
      notifyError(e.response?.data?.detail || "Failed to submit review. Please try again.");
    }
  });

  const onCancel = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    try {
      await cancelBooking(id);
      notifySuccess("Booking cancelled successfully.");
      qc.invalidateQueries({ queryKey: ["bookings"] });
    } catch (e) {
      notifyError(e.response?.data?.detail || "Cancellation failed. Please try again.");
    }
  };

  const tabs = [
    { id: "all", label: "All Stays" },
    { id: "upcoming", label: "Upcoming" },
    { id: "past", label: "Past Stays" },
    { id: "cancelled", label: "Cancelled" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Header Banner */}
      <div className="border-b border-slate-100 pb-6">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">My Reservations</h1>
        <p className="text-slate-500 mt-1">Manage your upcoming journeys and view details of your past stays.</p>
      </div>

      {/* Modern Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8" aria-label="Tabs">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`py-4 px-1 border-b-2 font-semibold text-sm transition-all whitespace-nowrap ${
                  active
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bookings List/Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : bookings && bookings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bookings.map((b) => (
            <BookingCard key={b.id} booking={b} onCancel={onCancel} onReview={(booking) => setReviewBooking(booking)} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-50/50 rounded-2xl border border-slate-100 max-w-xl mx-auto">
          <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
            <FiCalendar size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No Reservations Found</h3>
          <p className="text-slate-500 text-sm mt-1 mb-6 px-6">
            You don&apos;t have any bookings matching this category. Start planning your next premium escape.
          </p>
          <Link to="/browse">
            <button className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 shadow-md transition">
              <FiCompass size={18} />
              Explore Properties
            </button>
          </Link>
        </div>
      )}

      {/* Review Modal Overlay */}
      {reviewBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setReviewBooking(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition"
            >
              <FiX size={20} />
            </button>
            <div className="p-6">
              <h2 className="text-2xl font-black text-slate-900">Share Your Experience</h2>
              <p className="text-sm text-slate-500 mt-1 mb-6">
                How was your stay at <span className="font-semibold text-slate-700">{reviewBooking.property.title}</span>?
              </p>
              <ReviewForm
                onSubmit={(data) => {
                  reviewMutation.mutate({
                    booking_id: reviewBooking.id,
                    property_id: reviewBooking.property.id,
                    rating: data.rating,
                    comment: data.comment
                  });
                }}
                isSubmitting={reviewMutation.isPending}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
