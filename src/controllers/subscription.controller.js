import mongoose from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from '../utils/api_error.js'
import {ApiResponse} from '../utils/api_response.js'
import {asyncHandler} from '../utils/async_handler.js'

const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    if(!channelId){
        throw new ApiError(404,"Channel is neccessary")
    }
    const userId = req.user._id
    console.log(userId,channelId)
    const subscriber = await Subscription.findOne({
        channel: new mongoose.Types.ObjectId(channelId),
        subscriber: new mongoose.Types.ObjectId(userId)
    })
    console.log(subscriber)
    if(!subscriber){
        const newSubscriber = await Subscription.create({channel: channelId,subscriber: userId})
        console.log(newSubscriber)
        return res.status(200)
        .json(new ApiResponse(200,newSubscriber,"Subscribed Successfully"))
    }
    if(subscriber){
        await subscriber.deleteOne()
        return res.status(200)
        .json(new ApiResponse(200,null,"Unsubscribed Successfully"))

    }
    
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    const userId = req.user._id
    if(!userId.equals(channelId)){
        throw new ApiError(401,"Unauthorized Access")
    }
    const subscribers = await Subscription.find({
        channel: new mongoose.Types.ObjectId(channelId)
    }).populate("subscriber","username avatar")
    console.log(subscribers)
    res.status(200)
    .json(new ApiResponse(200,subscribers[0],"Channel Subscribers Fetched Successfully"))

})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const userId = req.user._id
    const subscribedTo = await Subscription.find({
        subscriber: new mongoose.Types.ObjectId(userId)
    }).populate("channel","username avatar")
    res.status(200)
    .json(new ApiResponse(200,subscribedTo[0],"Subscribed Channel Fetched Successfully"))
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}