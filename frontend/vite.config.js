import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/properties": "http://localhost:8001",
      "/api/search": "http://localhost:8001",
      "/api/reviews": "http://localhost:8001",
      "/uploads": "http://localhost:8001",
      "/api/ai": "http://localhost:8003",
      "/api/auth": "http://localhost:8002",
      "/api/users": "http://localhost:8002",
      "/api/bookings": "http://localhost:8002"
    }
  }
});
