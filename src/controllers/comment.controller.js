import mongoose from "mongoose"
import {Comment} from '../models/comment.model.js'
import {asyncHandler} from '../utils/async_handler.js'
import {ApiError} from '../utils/api_error.js'
import {ApiResponse} from '../utils/api_response.js'
import {Video} from '../models/video.model.js'

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

})

const addComment = asyncHandler(async (req, res) => {
    //check is content and id is valid
    //check does the video exists
    //create the comment
    //send the response
    // TODO: add a comment to a video
    const userId = req.user._id
    const {content} = req.body
    const {videoId} = req.params
    if(!mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError(400,"Invalid VideoId")
    }
    let trimmedContent;
    if(typeof content === "string"){
        trimmedContent  = content.trim()
    }else{
        throw new ApiError(400,"Content must be string")
    }
    if(!trimmedContent){
        throw new ApiError(400,"Content cannot be empty")
    }
    const isVideo = await Video.exists({_id: videoId})
    if(!isVideo){
        throw new ApiError(404,"Video not found")
    }
    const comment = await Comment.create({content:trimmedContent,video: videoId,owner: userId})
    if(!comment){
        throw new ApiError(500,"Error while creating a comment")
    }
    res.status(201)
    .json(new ApiResponse(201,comment,"Comment created successfully"))

})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const userId = req.user._id
    const {content} = req.body || {}
    const {videoId} = req.params
    const {commentId} = req.params
    if(!mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError(400,"Invalid videoId")
    }
    if(!mongoose.Types.ObjectId.isValid(commentId)){
        throw new ApiError(400,"Invalid commentId")
    }
    let trimmedContent;
    if(typeof content === "string" || content!== undefined){
        trimmedContent = content.trim()
    }else{
        throw new ApiError(400,"Updated comment must be string")
    }
    if(!trimmedContent){
        throw new ApiError(400,"Update comment cannot be empty")
    }
    const isVideo = await Video.exists({_id: videoId})
    if(!isVideo){
        throw new ApiError(404,"Video Not found")
    }
    const isComment = await Comment.findById(commentId)
    if(!isComment){
        throw new ApiError(404,"Comment not found")
    }
    if(!userId.equals(isComment.owner)){
        throw new ApiError(403,"Forbidden Request")
    }
    isComment.content = trimmedContent

    await isComment.save({validateBeforeSave: false})

    res.status(200).
    json(new ApiResponse(200,isComment,"Comment updated successfully"))

})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const userId = req.user._id
    const {videoId} = req.params
    const {commentId} = req.params
    if(!mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError(400,"Invalid VideoId")
    }
    if(!mongoose.Types.ObjectId.isValid(commentId)){
        throw new ApiError(400,"Invalid CommentId")
    }
    const isVideo = await Video.exists({_id: videoId})
    if(!isVideo){
        throw new ApiError(404,"Video not found")
    } 
    const comment = await Comment.findById(commentId)
    if(!comment){
        throw new ApiError(404,"Comment not found")
    }
    if(!userId.equals(comment.owner)){
        throw new ApiError(403,"Forbidden request")
    }else{
        await comment.deleteOne()
    }

    res.status(200)
    .json(new ApiResponse(200,null,"Comment deleted successfully"))
})

export {
        getVideoComments, 
        addComment, 
        updateComment,
        deleteComment
    }