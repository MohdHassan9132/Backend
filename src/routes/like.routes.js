import { Router } from "express";
import { getLikedVideos, toggleCommentLike, toggleTweetLike, toggleVideoLike } from "../controllers/like.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const likeRouter = Router()
likeRouter.route("/toggleVideoLike/:videoId").post(verifyJWT,toggleVideoLike)
likeRouter.route("/toggleTweetLike/:tweetId").post(verifyJWT,toggleTweetLike)
likeRouter.route("/toggleCommentLike/:commentId").post(verifyJWT,toggleCommentLike)
likeRouter.route("/getLikedVideos").get(verifyJWT,getLikedVideos)

export{likeRouter}