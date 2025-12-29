import {asyncHandler} from '../utils/async_handler.js'
import {ApiError} from '../utils/api_error.js'
import {ApiResponse} from '../utils/api_response.js'
import {uploadMedia,deleteMedia} from '../utils/cloudinary.js'
import {Tweet} from '../models/tweet.model.js'
import mongoose from 'mongoose'
import { User } from '../models/user.model.js'

const createTweet = asyncHandler(async (req, res) => {
    //check for file
    //check for content
    //upload if file
    //create the tweet doc in the db 
    //hide creadentials 
    //send the doc back to client
    const userId = req.user._id
    //TODO: create tweet
    const mediaFile = req.file?.path
    const {content} = req.body
    if(content === undefined){
        throw new ApiError(400,"Tweet content is required")
    }
    if(typeof content !== "string"){
        throw new ApiError(400,"Field must be a string")
    }
    const stringContent = content.trim()
    if(!stringContent){
        throw new ApiError(400,"Field cannot be empty")
    }
    if(stringContent.length > 500 ){
        throw new ApiError(400,"Content length is too long")
    }

    let mediaUrl;
    let mediaType;
    let mediaPublicId;
    if(mediaFile){
        const media =  await uploadMedia(mediaFile)
        if(!media){
            throw new ApiError(500,"Media upload failed")
        }
        mediaUrl = media.secure_url;
        mediaType = media.resource_type;
        mediaPublicId = media.public_id
    }
    const tweetdoc = await Tweet.create({owner: userId,content: stringContent,media: mediaUrl,mediaType,mediaPublicId})
    console.log(tweetdoc)
    const tweet = tweetdoc.toObject()
    delete tweet.mediaType
    delete tweet.mediaPublicId
    res.status(201)
    .json(new ApiResponse(201,tweet,"Tweet created successfully"))
})

;

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    //get tweetId
    //check is the tweetId valid
    //if not error
    //get the tweet
    //if not error
    //get userId from middleware
    //if userId not equals tweet owner
    //unauthorized acces
    // check for the data 
    // is it undefined
    //is it string
    //is it empty
    //is it valid for length
    //then update the tweet 
    //send back as response
    const {content} = req.body
    if(content === undefined){
        throw new ApiError(400,"Content is required")
    }
    if(typeof content !== "string"){
        throw new ApiError(400,"Content must be string")
    }
    const newContent = content.trim()
    if(!newContent){
        throw new ApiError(400,"Content cannot be empty")
    }
    if(newContent.length > 500){
        throw new ApiError(400,"Content too long")
    }
    const {tweetId} = req.params
    console.log(tweetId)
    if(!mongoose.Types.ObjectId.isValid(tweetId)){
        throw new ApiError(400,"Invalid tweetId")
    }
    const tweetDoc = await Tweet.findById(tweetId)
    if(!tweetDoc){
        throw new ApiError(404,"Tweet not foudn")
    }
    const userId = req.user._id
    if(!userId.equals(tweetDoc.owner)){
        throw new ApiError(403,"Forbidden Access")
    }

    if(tweetDoc.content === newContent){
        return res.status(200)
        .json(new ApiResponse(200,null,"Nothing to change"))
    }
    tweetDoc.content = newContent

    await tweetDoc.save({validateBeforeSave: false})
    const tweet = tweetDoc.toObject()
    delete tweet.mediaPublicId
    delete tweet.mediaType
    res.status(200)
    .json(new ApiResponse(200,tweet,"Tweet updated successfully"))

})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const userId = req.user._id
    const {tweetId} = req.params
    if(!mongoose.Types.ObjectId.isValid(tweetId)){
        throw new ApiError(400,"Invalid tweetId")
    }
    const tweetDoc = await Tweet.findById(tweetId)
    if(!tweetDoc){
        throw new ApiError(404,"Tweet not found")
    }
    if(!userId.equals(tweetDoc.owner)){
        throw new ApiError(401,"Unauthorized Access")
    }
    if(tweetDoc.mediaPublicId){
        await deleteMedia(tweetDoc.mediaPublicId,tweetDoc.mediaType)
    }
    await tweetDoc.deleteOne()
    res.status(200)
    .json(new ApiResponse(200,null,"Tweet deleted successfully"))

})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}