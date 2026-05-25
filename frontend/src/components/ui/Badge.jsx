const colors = { confirmed: "bg-green-100 text-green-700", cancelled: "bg-red-100 text-red-700", completed: "bg-blue-100 text-blue-700", upcoming: "bg-red-100 text-red-700" };
export default function Badge({ status }) { return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${colors[status] || "bg-gray-100 text-gray-700"}`}>{status}</span>; }
