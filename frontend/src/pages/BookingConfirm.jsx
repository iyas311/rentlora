import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { getBooking } from "../api/bookings";

export default function BookingConfirm() {
  const { id } = useParams();
  const { data } = useQuery({ queryKey: ["booking", id], queryFn: () => getBooking(id) });
  if (!data) return null;
  return <div className="mx-auto max-w-2xl rounded-lg bg-white p-6 shadow"><h1 className="text-2xl font-semibold">Booking Confirmed</h1><p>Reference #{data.id}</p><p>{data.property.title}</p><p>{data.check_in} - {data.check_out}</p><div className="mt-4 flex gap-2"><Link className="rounded bg-accent px-4 py-2 text-white" to="/bookings">View All Bookings</Link><Link className="rounded border border-primary px-4 py-2 text-primary" to="/browse">Browse More Properties</Link></div></div>;
}
