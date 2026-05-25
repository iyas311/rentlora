import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { cancelBooking } from "../api/bookings";
import BookingCard from "../components/bookings/BookingCard";
import Button from "../components/ui/Button";
import { notifyError, notifySuccess } from "../components/ui/Toast";
import { useBookings } from "../hooks/useBookings";

export default function MyBookings() {
  const [tab, setTab] = useState("all");
  const { data } = useBookings(tab);
  const qc = useQueryClient();
  const onCancel = async (id) => {
    try { await cancelBooking(id); notifySuccess("Booking cancelled"); qc.invalidateQueries({ queryKey: ["bookings"] }); } catch (e) { notifyError(e.response?.data?.detail || "Cancel failed"); }
  };
  return <div><div className="mb-4 flex gap-2">{["upcoming", "past", "cancelled", "all"].map((t) => <Button key={t} variant={tab === t ? "primary" : "secondary"} onClick={() => setTab(t)}>{t}</Button>)}</div><div className="space-y-3">{data?.map((b) => <BookingCard key={b.id} booking={b} onCancel={onCancel} />)}</div></div>;
}
