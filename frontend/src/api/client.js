import axios from "axios";

const client = axios.create({ baseURL: "/api" });

function isTokenExpired(token) {
  if (!token) return true;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return false;
    return Date.now() >= (payload.exp * 1000 - 5000); // 5s buffer
  } catch {
    return true;
  }
}

let refreshPromise = null;

client.interceptors.request.use(async (config) => {
  let token = localStorage.getItem("access_token");
  
  if (token && isTokenExpired(token)) {
    const refresh = localStorage.getItem("refresh_token");
    if (refresh) {
      try {
        if (!refreshPromise) {
          refreshPromise = axios.post("/api/auth/refresh", { refresh_token: refresh })
            .then((res) => {
              localStorage.setItem("access_token", res.data.access_token);
              refreshPromise = null;
              return res.data.access_token;
            })
            .catch((err) => {
              refreshPromise = null;
              throw err;
            });
        }
        token = await refreshPromise;
      } catch {
        localStorage.clear();
        window.location.href = "/login";
        return config;
      }
    }
  }
  
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
        const { data } = await axios.post("/api/auth/refresh", { refresh_token: refresh });
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
