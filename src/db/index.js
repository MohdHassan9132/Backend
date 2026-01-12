// src/db/index.js
import mongoose from "mongoose";

const dbConnection = async (DB_URL, DB_NAME) => {
  if (!DB_URL || !DB_NAME) {
    throw new Error("Database env variables missing");
  }

  await mongoose.connect(DB_URL, {
    dbName: DB_NAME
  });

  console.log("✅ Database connected");
};

export { dbConnection };
