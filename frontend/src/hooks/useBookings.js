import { useQuery } from "@tanstack/react-query";
import { getMyBookings } from "../api/bookings";
export const useBookings = (status) => useQuery({ queryKey: ["bookings", status], queryFn: () => getMyBookings(status) });
