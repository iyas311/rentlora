import axios from "axios";
import { currentIdToken } from "./cognito";

const client = axios.create({ baseURL: "/api" });

// Attach a fresh Cognito ID token (the SDK refreshes the session automatically).
client.interceptors.request.use(async (config) => {
  let token = await currentIdToken();
  if (!token) token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, the session is gone — clear and bounce to login.
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("access_token");
      if (window.location.pathname !== "/login") window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default client;
