import { FaStar } from "react-icons/fa";
export default function StarRating({ value = 0, onChange }) {
  return <div className="flex gap-1">{[1,2,3,4,5].map((n)=><button key={n} type="button" onClick={()=>onChange?.(n)}><FaStar className={n<=value ? "text-yellow-400" : "text-gray-300"} /></button>)}</div>;
}
