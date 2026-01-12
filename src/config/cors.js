// src/config/cors.js
import { ENV } from "./env.js";

export const corsOptions = {
  origin: ENV.FRONTEND_URL,
  credentials: true
};
