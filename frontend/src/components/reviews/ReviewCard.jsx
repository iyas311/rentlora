import StarRating from "../ui/StarRating";
import { formatDate } from "../../utils/dateUtils";

export default function ReviewCard({ review }) {
  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {review.reviewer_avatar ? (
            <img src={review.reviewer_avatar} alt={review.reviewer_name} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
          ) : (
            <div className="flex w-10 h-10 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-sm font-bold text-white shadow-sm">
              {getInitials(review.reviewer_name)}
            </div>
          )}
          <div>
            <p className="font-bold text-slate-800 leading-tight">{review.reviewer_name}</p>
            {review.created_at && (
              <p className="text-xs font-medium text-slate-400 mt-0.5">{formatDate(review.created_at)}</p>
            )}
          </div>
        </div>
        <div className="bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
          <StarRating value={review.rating} />
        </div>
      </div>
      <p className="text-slate-600 leading-relaxed text-sm">"{review.comment}"</p>
    </div>
  );
}
