import client from "./client";
export const loginApi = (payload) => client.post("/auth/login", payload).then((r) => r.data);
export const registerApi = (payload) => client.post("/auth/register", payload).then((r) => r.data);
export const logoutApi = () => client.post("/auth/logout").then((r) => r.data);
