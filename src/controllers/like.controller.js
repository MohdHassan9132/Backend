import {asyncHandler} from '../utils/async_handler.js'
import {ApiResponse} from '../utils/api_response.js'
import {ApiError} from '../utils/api_error.js'
import {Comment} from '../models/comment.model.js'
import {Tweet} from '../models/tweet.model.js'
import {Video} from '../models/video.model.js'
import {Like} from '../models/likes.model.js'
import mongoose from 'mongoose'
const toggleVideoLike = asyncHandler(async (req, res) => {
    //check is the is id valid
    //check does the video exist
    //check is a document exisit with videoId and userId
    //if not create a document 
    //if yes delete the document
    //TODO: toggle like on video
    const {videoId} = req.params
    const userId = req.user._id
    if(!mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError(400,"Invalid Videoid")
    }
    const isVideo = await Video.exists({_id: videoId})
    if(!isVideo){
        throw new ApiError(404,"No video found")
    }
    const removeVideoLike = await Like.findOneAndDelete({
        video: videoId,
        likedBy: userId
    })
    if(removeVideoLike){
        return res.status(200)
        .json( new ApiResponse(200,{liked: false},"Video disliked"))
    }
    await Like.create({
        video: videoId,
        likedBy: userId
    })
    res.status(200)
    .json(new ApiResponse(200,{liked: true},"Video liked")) 
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    //TODO: toggle like on comment
    const {commentId} = req.params
    if(!mongoose.Types.ObjectId.isValid(commentId)){
        throw new ApiError(400,"Invalid Commentid")
    }
    const userId = req.user._id
    const isComment = await Comment.exists({
        _id: commentId
    })
    if(!isComment){
        throw new ApiError(404,"Comment not found")
    }
    const removeCommentLike = await Like.findOneAndDelete({
        comment: commentId,
        likedBy: userId
    })
    if(removeCommentLike){
        return res.status(200)
        .json(new ApiResponse(200,{liked: false},"Comment disliked"))
    }
    await Like.create({
        comment: commentId,
        likedBy: userId
    })
    res.status(200)
    .json(new ApiResponse(200,{liked: true},"Comment liked"))

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    //TODO: toggle like on tweet
    const {tweetId} = req.params
    if(!mongoose.Types.ObjectId.isValid(tweetId)){
        throw new ApiError(400,"Invalid Tweetid")
    }
    const userId = req.user._id
    const isTweet = await Tweet.exists({
        _id: tweetId
    })
    if(!isTweet){
        throw new ApiError(404,"Tweet not found")
    }
    const removeTweetLike = await Like.findOneAndDelete({
        tweet: tweetId,
        likedBy: userId
    })
    if(removeTweetLike){
        return res.status(200)
        .json(new ApiResponse(200,{liked: false},"Tweet disliked"))
    }
    await Like.create({
        tweet: tweetId,
        likedBy: userId
    })
    res.status(200)
    .json(new ApiResponse(200,{liked: true},"Tweet Liked"))
})

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const userId = req.user._id
    const likedVideos = await Like.aggregate([
        {
            $match: {
                likedBy: userId,
                video: {$exists: true},
            }
        },
        {
            $sort:{createdAt: -1}
        },
        {
            $lookup:{
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "likedVideos",
                pipeline:[
                    {
                        $match: {isPublished: true}
                    },
                    {
                        $lookup:{
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner"
                        }
                    },
                    {
                        $unwind: "$owner",
                        
                    },
                    {
                        $project: {
                            owner:{
                                username: "$owner.username",
                                avatar: "$owner.avatar",
                                //here will be of the owner
                            },
                            videoFile: 1,
                            thumbnail: 1,
                            title: 1,
                            description: 1,
                            duration: 1,
                            views: 1,
                            isPublished: 1
                            //if i do here that will be of the video doc
                        }
                    },
                ]
            }
        },
        {
            $unwind: "$likedVideos"
        },
        {
            $project:{
                likedVideos: 1,
                _id: 0
            }
        }
    ])
    if(!likedVideos.length){
        return res.status(200)
        .json(new ApiResponse(200,null,"No liked videos found"))
    }
    res.status(200)
    .json(new ApiResponse(200,likedVideos,"Liked videos fetched successfully"))
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}