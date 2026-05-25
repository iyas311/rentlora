import client from "./client";
export const getPropertyReviews = (propertyId) => client.get(`/reviews/property/${propertyId}`).then((r) => r.data);
export const createReview = (payload) => client.post("/reviews", payload).then((r) => r.data);
export const myReviews = () => client.get("/reviews/my").then((r) => r.data);
export const deleteReview = (id) => client.delete(`/reviews/${id}`).then((r) => r.data);
