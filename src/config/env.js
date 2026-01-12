// src/config/env.js
const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PROD = NODE_ENV === "production";

export const ENV = {
  NODE_ENV,
  IS_PROD,

  PORT: Number(process.env.PORT || 3000),

  FRONTEND_URL: process.env.FRONTEND_URL,

  DB: {
    URL: process.env.DB_URL,
    NAME: process.env.DB_NAME
  },

  COOKIE: {
    SECURE: IS_PROD,
    SAME_SITE: IS_PROD ? "none" : "lax"
  },

  TOKENS: {
    ACCESS_SECRET: process.env.ACCESS_TOKEN_SECRET,
    REFRESH_SECRET: process.env.REFRESH_TOKEN_SECRET
  }
};
