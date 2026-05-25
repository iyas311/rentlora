import { differenceInCalendarDays, format } from "date-fns";
export const formatDate = (d) => format(new Date(d), "dd MMM yyyy");
export const calcNights = (a, b) => (!a || !b ? 0 : Math.max(0, differenceInCalendarDays(new Date(b), new Date(a))));
export const isDateAvailable = (checkIn, checkOut, booked = []) => !booked.some((r) => !(new Date(r.check_out) <= new Date(checkIn) || new Date(r.check_in) >= new Date(checkOut)));
