import mongoose from "mongoose"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from '../utils/api_error.js'
import {ApiResponse} from '../utils/api_response.js'
import {asyncHandler} from '../utils/async_handler.js'
import { User } from "../models/user.model.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    if(!channelId){
        throw new ApiError(400,"ChannelId is neccessary")
    }
    if(!mongoose.Types.ObjectId.isValid(channelId)){
        throw new ApiError(400,"Invalid ChannelId")
    }
    const userId = req.user._id
    const isExist = await User.exists({
        _id: channelId
    })
    console.log(isExist)
    if(!isExist){
        throw new ApiError(404,"Channel Not found")
    }
    const subscriber = await Subscription.findOne({
        channel: channelId,
        subscriber: userId
    })
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
    if(!channelId){
        throw new ApiError(400,"ChannelId is required")
    }
    if(!mongoose.Types.ObjectId.isValid(channelId)){
        throw new ApiError(400,"Invalid channelId")
    }
    const userId = req.user._id
    if(!userId.equals(channelId)){
        throw new ApiError(403,"Forbidden request")
    }
    const subscribers = await Subscription.find({
        channel: channelId,
    }).populate("subscriber","username avatar")
    res.status(200)
    .json(new ApiResponse(200,subscribers,"Channel Subscribers Fetched Successfully"))

})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const userId = req.user._id
    const subscribedTo = await Subscription.find({
        subscriber: userId
    }).populate("channel","username avatar")
    res.status(200)
    .json(new ApiResponse(200,subscribedTo,"Subscribed Channel Fetched Successfully"))
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}