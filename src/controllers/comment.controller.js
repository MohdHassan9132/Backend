import mongoose from "mongoose"
import {Comment} from '../models/comment.model.js'
import {asyncHandler} from '../utils/async_handler.js'
import {ApiError} from '../utils/api_error.js'
import {ApiResponse} from '../utils/api_response.js'
import {Video} from '../models/video.model.js'

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params
  if (!videoId) {
    throw new ApiError(400, "VideoId is required")
  }
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid VideoId")
  }

  const { page, limit } = req.query
  const noOfPage = Number(page)
  const noOfLimit = Number(limit)

  const variables = {}
  variables.page = noOfPage >= 1 && isFinite(noOfPage) ? noOfPage : 1
  variables.limit = noOfLimit >= 1 && isFinite(noOfLimit) ? noOfLimit : 10

  const pipeline = [
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId)
      }
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
        pipeline: [
          { $match: { isPublished: true } }
        ]
      }
    },
    {
      $match: {
        video: { $ne: [] }
      }
    },
    {
      $facet: {
        metaData: [
          { $count: "totalItems" }
        ],
        data: [
          { $sort: { createdAt: -1 } },
          { $skip: (variables.page - 1) * variables.limit },
          { $limit: variables.limit },
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "commentBy",
              pipeline: [
                {
                  $project: {
                    avatar: 1,
                    username: 1
                  }
                }
              ]
            }
          },
          { $unwind: "$commentBy" },
          {
            $project: {
              _id: 1,
              content: 1,
              commentBy: 1
            }
          }
        ]
      }
    }
  ]

  const result = await Comment.aggregate(pipeline)

  const totalItems = result[0].metaData[0]?.totalItems || 0
  const totalPages = Math.ceil(totalItems / variables.limit)

  const pagination = {
        currentPage: variables.page,
        perPage: variables.limit,
        totalItems,
        totalPages,
        hasPrevPage: variables.page > 1,
        hasNextPage: variables.page < totalPages
  }

  res.status(200).json(
        new ApiResponse(
            200,
            { comments: result[0].data, pagination },
            "Video comments fetched successfully"
        )
    )
    // const comments = Comment.aggregate([
    //     {
    //         $match: {video: new mongoose.Types.ObjectId(videoId)}
    //     },
    //     {
    //         $lookup: {
    //             from: "videos",
    //             foreignField: "_id",
    //             localField: "video",
    //             as: "video",
    //             pipeline:[
    //                 {
    //                     $match: {isPublished: true}
    //                 }
    //             ]
    //         }
    //     },
    //     {
    //         $match: {
    //             video: {$ne: []}
    //         }
    //     },
    //     {
    //         $lookup: {
    //             from: "users",
    //             localField: "owner",
    //             foreignField: "_id",
    //             as: "commentBy",
    //             pipeline:[
    //                 {
    //                     $project:{
    //                         avatar: 1,
    //                         username: 1
    //                     }
    //                 },

    //             ]
    //         }
    //     },
    //     {
    //         $unwind: "$commentBy"
    //     },
    //     {
    //         $project:{
    //             _id: 1,
    //             content: 1,
    //             commentBy: 1,
    //         }
    //     }

    // ])
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
    if(content === undefined || content === null){
        throw new ApiError(400,"Content is required")
    }
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
    const {content} = req.body
    const {videoId} = req.params
    const {commentId} = req.params
    if(!mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError(400,"Invalid videoId")
    }
    if(!mongoose.Types.ObjectId.isValid(commentId)){
        throw new ApiError(400,"Invalid commentId")
    }
    let trimmedContent;
    if(typeof content === "string"){
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
    const isComment = await Comment.findOneAndUpdate(
        {
            _id: commentId,
            owner: userId,
            video: videoId
        },
        {
            content: trimmedContent
        },
        {
            new: true,
            runValidators: true
        }
    )
    if(!isComment){
        throw new ApiError(404,"Comment not found")
    }

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
    const comment = await Comment.findOneAndDelete({
        _id: commentId,
        owner: userId,
        video: videoId
    })
    if(!comment){
        throw new ApiError(404,"Comment not found")
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