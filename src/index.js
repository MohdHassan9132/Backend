import "dotenv/config";
import { app } from "./app.js";
import { ENV } from "./config/env.js";
import { dbConnection } from "./db/index.js";

(async () => {
  try {
    await dbConnection(ENV.DB.URL, ENV.DB.NAME);

    app.listen(ENV.PORT, () => {
      console.log(
        ENV.IS_PROD
          ? "🚀 Server running in PRODUCTION"
          : "🧪 Server running in DEVELOPMENT"
      );
    });
  } catch (error) {
    console.error("❌ Server startup failed:", error.message);
    process.exit(1);
  }
})();
