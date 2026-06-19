import { useState } from "react";
import StarRating from "../ui/StarRating";

export default function ReviewForm({ onSubmit, isSubmitting }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">Overall Rating</label>
        <StarRating value={rating} onChange={setRating} />
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2">Your Review</label>
        <textarea
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent focus:bg-white text-slate-900 placeholder-slate-400 transition-all duration-200 resize-none"
          rows={4}
          placeholder="What did you love about your stay?"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>
      <button
        onClick={() => onSubmit({ rating, comment })}
        disabled={isSubmitting || !comment.trim()}
        className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Submitting..." : "Submit Review"}
      </button>
    </div>
  );
}
