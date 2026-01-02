import { Router } from "express";
import {upload} from '../middlewares/multer.middleware.js'
import {verifyJWT} from '../middlewares/auth.middleware.js'
import { createTweet, deleteTweet, getUserTweets, updateTweet } from "../controllers/tweet.controller.js";
const tweetRouter = Router()
tweetRouter.route("/createTweet").post(verifyJWT,upload.single("media"),createTweet)
tweetRouter.route("/getUserTweets").get(verifyJWT,getUserTweets)
tweetRouter.route("/updateTweet/:tweetId").patch(verifyJWT,updateTweet)
tweetRouter.route("/deleteTweet/:tweetId").delete(verifyJWT,deleteTweet)

export {tweetRouter}