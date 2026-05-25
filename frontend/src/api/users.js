import client from "./client";
export const getMe = () => client.get("/users/me").then((r) => r.data);
export const updateMe = (payload) => client.put("/users/me", payload).then((r) => r.data);
export const getUserPublic = (id) => client.get(`/users/${id}/public`).then((r) => r.data);
