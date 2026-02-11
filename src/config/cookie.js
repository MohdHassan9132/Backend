// src/config/cookie.js
import { ENV } from "./env.js";

export const cookieOptions = {
  httpOnly: true,
  secure: ENV.COOKIE.SECURE,
  sameSite: ENV.COOKIE.SAME_SITE,
  path: "/",
  maxAge: 30 * 24 * 60 * 60 * 1000
  
};
