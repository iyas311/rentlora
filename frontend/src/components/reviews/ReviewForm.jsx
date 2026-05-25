import { useState } from "react";
import StarRating from "../ui/StarRating";
import Button from "../ui/Button";
export default function ReviewForm({ onSubmit }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  return <div className="space-y-2 rounded-lg bg-white p-3 shadow"><StarRating value={rating} onChange={setRating} /><textarea className="w-full rounded border p-2" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} /><Button onClick={() => onSubmit({ rating, comment })}>Submit</Button></div>;
}
