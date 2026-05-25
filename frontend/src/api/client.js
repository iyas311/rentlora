import axios from "axios";

const client = axios.create({ baseURL: "" });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401 && !err.config._retry) {
      err.config._retry = true;
      try {
        const refresh = localStorage.getItem("refresh_token");
        const { data } = await axios.post("/auth/refresh", { refresh_token: refresh });
        localStorage.setItem("access_token", data.access_token);
        err.config.headers.Authorization = `Bearer ${data.access_token}`;
        return client(err.config);
      } catch {
        localStorage.clear();
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default client;
