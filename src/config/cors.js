// src/config/cors.js
import { ENV } from "./env.js";

export const corsOptions = {
  origin: [ENV.FRONTEND_URL,"http://localhost:5173"],
  credentials: true
};
