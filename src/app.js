// src/app.js
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { corsOptions } from "./config/cors.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";

const app = express();

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public/temp"));

app.use(cors(corsOptions));
app.use(cookieParser());

// routes
import { userRouter } from "./routes/user.routes.js";
import { videoRouter } from "./routes/video.routes.js";
import { subscriptionRouter } from "./routes/subscription.routes.js";
import { tweetRouter } from "./routes/tweet.routes.js";
import { commentRouter } from "./routes/comment.routes.js";
import { likeRouter } from "./routes/like.routes.js";
import { playlistRouter } from "./routes/playlist.routes.js";

app.use("/api/v1/user", userRouter);
app.use("/api/v1/video", videoRouter);
app.use("/api/v1/subscription", subscriptionRouter);
app.use("/api/v1/tweet", tweetRouter);
app.use("/api/v1/comment", commentRouter);
app.use("/api/v1/like", likeRouter);
app.use("/api/v1/playlist", playlistRouter);

app.use(errorMiddleware);

export { app };
