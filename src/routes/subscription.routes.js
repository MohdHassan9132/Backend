import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getSubscribedChannels, getUserChannelSubscribers, toggleSubscription } from "../controllers/subscription.controller.js";

const subscriptionRouter = Router()
subscriptionRouter.route("/toggleSubscription/:channelId").post(verifyJWT,toggleSubscription)
subscriptionRouter.route("/getUserChannelSubscribers/:channelId").get(verifyJWT,getUserChannelSubscribers)
subscriptionRouter.route("/getSubscribedChannels").get(verifyJWT,getSubscribedChannels)

export{subscriptionRouter}