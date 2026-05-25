import StarRating from "../ui/StarRating";
export default function ReviewCard({ review }) {
  return <div className="rounded-lg bg-white p-3 shadow"><div className="flex items-center justify-between"><p className="font-medium">{review.reviewer_name}</p><StarRating value={review.rating} /></div><p className="text-sm text-muted">{review.comment}</p></div>;
}
