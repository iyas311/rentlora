import client from "./client";
export const getMyBookings = (status = "all") => client.get("/bookings/my", { params: { status } }).then((r) => r.data);
export const getBooking = (id) => client.get(`/bookings/${id}`).then((r) => r.data);
export const createBooking = (payload) => client.post("/bookings", payload).then((r) => r.data);
export const cancelBooking = (id) => client.put(`/bookings/${id}/cancel`).then((r) => r.data);
export const getHostBookings = () => client.get("/bookings/host/mine").then((r) => r.data);
export const completeBooking = (id) => client.put(`/bookings/${id}/complete`).then((r) => r.data);
