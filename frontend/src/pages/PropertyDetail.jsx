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

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: property } = useQuery({ queryKey: ["property", id], queryFn: () => getProperty(id) });
  const { data: reviews } = useQuery({ queryKey: ["reviews", id], queryFn: () => getPropertyReviews(id) });
  const bookMutation = useMutation({ mutationFn: createBooking, onSuccess: (res) => navigate(`/bookings/confirm/${res.id}`), onError: (e) => notifyError(e.response?.data?.detail || "Booking failed") });
  if (!property) return null;
  return <div className="grid grid-cols-1 gap-6 md:grid-cols-[60%_40%]"><div className="space-y-4"><ImageGallery images={property.images} /><h1 className="text-3xl font-bold">{property.title}</h1><p>{property.city}, {property.country}</p><p>{property.description}</p><AmenitiesGrid amenities={property.amenities} /><div className="space-y-2"><h3 className="text-xl font-semibold">Reviews</h3>{reviews?.reviews?.map((r) => <ReviewCard key={r.id} review={r} />)}</div></div><BookingWidget property={property} onBook={(form) => bookMutation.mutate({ ...form, property_id: Number(id) })} /></div>;
}
