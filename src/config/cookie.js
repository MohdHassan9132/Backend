// src/config/cookie.js
import { ENV } from "./env.js";

export const cookieOptions = {
  httpOnly: true,
  secure: ENV.COOKIE.SECURE,
  sameSite: ENV.COOKIE.SAME_SITE
};
