import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { createBooking } from "../api/bookings";
import { getProperty } from "../api/properties";
import { getPropertyReviews } from "../api/reviews";
import AmenitiesGrid from "../components/properties/AmenitiesGrid";
import BookingWidget from "../components/properties/BookingWidget";
import ImageGallery from "../components/properties/ImageGallery";
import ReviewCard from "../components/reviews/ReviewCard";
import { notifyError } from "../components/ui/Toast";
import { FiMapPin, FiMessageSquare } from "react-icons/fi";
import { Skeleton, TextSkeleton } from "../components/ui/Skeleton";

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: property } = useQuery({ queryKey: ["property", id], queryFn: () => getProperty(id) });
  const { data: reviews } = useQuery({ queryKey: ["reviews", id], queryFn: () => getPropertyReviews(id) });
  const bookMutation = useMutation({ mutationFn: createBooking, onSuccess: (res) => navigate(`/bookings/confirm/${res.id}`), onError: (e) => notifyError(e.response?.data?.detail || "Booking failed") });
  
  if (!property) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 space-y-3">
          <Skeleton className="h-10 w-1/2 md:w-1/3 rounded-lg" />
          <Skeleton className="h-5 w-1/3 md:w-1/4 rounded-md" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-12">
          <div className="space-y-10">
            <Skeleton className="w-full aspect-[16/9] rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-1/4 rounded-lg" />
              <TextSkeleton lines={4} className="h-5 w-full rounded-md" />
            </div>
          </div>
          <div>
            <Skeleton className="w-full h-96 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Title & Meta */}
      <div className="mb-6">
        <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-2">{property.title}</h1>
        <div className="flex items-center text-slate-500 font-medium">
          <FiMapPin className="mr-1.5 text-indigo-600" />
          {property.city}, {property.country}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-12 relative items-start">
        {/* Main Content Column */}
        <div className="space-y-10">
          
          <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-100">
            <ImageGallery images={property.images} />
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">About this space</h2>
            <p className="text-slate-600 leading-relaxed text-lg">{property.description}</p>
          </div>

          <hr className="border-slate-100" />

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-slate-900">What this place offers</h2>
            <AmenitiesGrid amenities={property.amenities} />
          </div>

          <hr className="border-slate-100" />

          {/* Reviews Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Guest Reviews & Experiences</h2>
              {reviews?.total_reviews > 0 && (
                <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                  ★ {reviews.avg_rating} · {reviews.total_reviews} Reviews
                </span>
              )}
            </div>
            
            {reviews?.reviews?.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {reviews.reviews.map((r) => (
                  <ReviewCard key={r.id} review={r} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100 px-6">
                <FiMessageSquare size={40} className="mx-auto text-indigo-300 mb-4" />
                <h3 className="text-lg font-bold text-slate-800">No reviews yet</h3>
                <p className="text-slate-500 mt-1">
                  Be the first to share your experience after your stay!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar / Booking Widget Column */}
        <div className="sticky top-24">
          <BookingWidget 
            property={property} 
            onBook={(form) => bookMutation.mutate({ ...form, property_id: Number(id) })} 
          />
        </div>
      </div>
    </div>
  );
}
