// src/config/env.js
const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PROD = NODE_ENV === "production";

export const ENV = {
  NODE_ENV,
  IS_PROD,

  PORT: Number(process.env.PORT || 3000),

  FRONTEND_URL: IS_PROD ? process.env.FRONTEND_URL : "http://localhost:5173",

  GOOGLE:{
    CLIENT_ID:process.env.GOOGLE_CLIENT_ID,
    CLIENT_SECRET:process.env.GOOGLE_CLIENT_SECRET,
    REDIRECT_URL: IS_PROD ? process.env.GOOGLE_REDIRECT_URL : 'http://localhost:3000/api/v1/user/googleAuth'
  },
  SESSION: process.env.SESSION_SECRET,
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
