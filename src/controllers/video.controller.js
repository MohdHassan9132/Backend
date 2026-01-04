import { ApiResponse } from "../utils/api_response.js"
import { ApiError } from "../utils/api_error.js"
import { Video } from "../models/video.model.js"
import { asyncHandler } from "../utils/async_handler.js"
import { uploadMedia,deleteMedia } from "../utils/cloudinary.js"
import { User } from "../models/user.model.js"
import mongoose from "mongoose"



const getAllVideos = asyncHandler(async (req, res) => {
    const { page, limit, query, sort, userId } = req.query

    const variables = {}

    const parsedPage = Number(page)
    variables.page = Number.isFinite(parsedPage) && parsedPage >= 1 ? parsedPage : 1

    const parsedLimit = Number(limit)
    variables.limit = Number.isFinite(parsedLimit) && parsedLimit >= 1 ? parsedLimit : 10

    if (typeof query === "string" && query.trim()) {
        variables.query = query.trim()
    }

    if (typeof userId === "string" && mongoose.Types.ObjectId.isValid(userId)) {
        variables.userId = new mongoose.Types.ObjectId(userId)
    }

    const pipeline = []

    if (variables.userId) {
        pipeline.push({ $match: { owner: variables.userId } })

        if (!req.user?._id?.equals(variables.userId)) {
            pipeline.push({ $match: { isPublished: true } })
        }

        if (variables.query) {
            pipeline.push({
                $match: {
                    $or: [
                        { title: { $regex: variables.query, $options: "i" } },
                        { description: { $regex: variables.query, $options: "i" } }
                    ]
                }
            })
        }
    } else {
        pipeline.push({ $match: { isPublished: true } })

        if (variables.query) {
            pipeline.push({
                $match: {
                    $or: [
                        { title: { $regex: variables.query, $options: "i" } },
                        { description: { $regex: variables.query, $options: "i" } }
                    ]
                }
            })
        }
    }

    const normalizedSort = typeof sort === "string" ? sort.trim().toLowerCase() : ""
    let sortStage

    if (normalizedSort === "latest") {
        sortStage = { createdAt: -1 }
    } else if (normalizedSort === "oldest") {
        sortStage = { createdAt: 1 }
    } else {
        sortStage = { views: -1 }
    }

    pipeline.push({ $sort: sortStage })

    pipeline.push({
        $facet: {
            metadata: [{ $count: "totalItems" }],
            data: [
                { $skip: (variables.page - 1) * variables.limit },
                { $limit: variables.limit },
                {
                    $lookup: {
                        from: "users",
                        localField: "owner",
                        foreignField: "_id",
                        as: "owner"
                    }
                },
                { $unwind: "$owner" },
                {
                    $project: {
                        _id: 1,
                        videoFile: 1,
                        thumbnail: 1,
                        title: 1,
                        description: 1,
                        duration: 1,
                        views: 1,
                        isPublished: 1,
                        owner: {
                            _id: "$owner._id",
                            username: "$owner.username",
                            avatar: "$owner.avatar"
                        }
                    }
                }
            ]
        }
    })

    const result = await Video.aggregate(pipeline)

    const totalItems = result[0].metadata[0]?.totalItems || 0
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
            { videos: result[0].data, pagination },
            "Fetched the videos successfully"
        )
    )
})



const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    let trimmedTitle;
    if(title !== undefined && title !== null){
        if(typeof title === "string"){
            trimmedTitle = title.trim()
            if(!trimmedTitle){
                throw new ApiError(400,"Title cannot be empty")
            }
        }else{
            throw new ApiError(400,"Title must be string")
        }
    }else{
        throw new ApiError(400,"Title is required")
    }
    let trimmedDescription;
    if(description !== null && description !== undefined){
        if(typeof description === "string"){
            trimmedDescription = description.trim()
            if(!trimmedDescription){
                throw new ApiError(400,"description cannot be empty")
            }
        }else{
            throw new ApiError(400,"Description must be string")
        }
    }

    const video = req?.files?.video
    if(!video || video.length === 0){
        throw new ApiError(400,"Video file is required")
    }
    const thumbnail = req?.files?.thumbnail
    if(!thumbnail || thumbnail.length === 0){
        throw new ApiError(400,"Thumbnail is required")
    }
    let videoFile,thumbnailFile;
    try {
        videoFile = await uploadMedia(video[0])
        thumbnailFile = await uploadMedia(thumbnail[0])

        const videoDoc = await Video.create({videoFile: videoFile.secure_url,videoPublicId: videoFile.public_id,thumbnail: thumbnailFile.secure_url, thumbnailPublicId: thumbnailFile.public_id,title: trimmedTitle,description: trimmedDescription,owner: req.user._id,duration: videoFile.duration
        })

        if(!videoDoc){
            throw new ApiError(500,"Error while creating the video doc")
        }
        const secureVideo = videoDoc.toObject()
        delete secureVideo.videoPublicId
        delete secureVideo.thumbnailPublicId
        res.status(201)
        .json(new ApiResponse(201,secureVideo,"Video published successfully"))

    } catch (error) {
        if(thumbnailFile?.public_id){
            await deleteMedia(thumbnailFile.public_id,"image")
        }
        if(videoFile?.public_id){
            await deleteMedia(videoFile.public_id,"video")
        }
        throw error
    }
})

const getVideoById = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    if(!videoId){
        throw new ApiError(400,"VideoId is required")
    }
    if(!mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError(400,"Invalid VideoId")
    }
    const userId = req.user._id
    const video = await Video.aggregate([
        {
            $match: {_id: new mongoose.Types.ObjectId(videoId)}
        },
        {
            $lookup:{
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline:[
                    {
                        $lookup:{
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribersCount"
                        }
                    },
                    {
                        $addFields:{
                            subscribers:{$size: "$subscribersCount"},
                            isSubscribed:{
                                $cond:{
                                    if:{$in:[userId,"$subscribersCount.subscriber"]},//$in:[userId,"$subscribersArray"]
                                    then: 1,
                                    else: 0
                                }
                            }
                        }
                    },
                    {
                        $project:{
                            subscribers: 1,
                            isSubscribed: 1,
                            avatar: 1,
                            username: 1,

                        }
                    },
                ],
            }
        },
        {
            $unwind: "$owner"
        },
        {
            $project:{
                owner: 1,
                videoFile: 1,
                thumbnail: 1,
                duration: 1,
                title: 1,
                description: 1,
                views: 1,
            }
        }
    ])
    if(video.length !== 1){
        throw new ApiError(404,"No video found")
    }
    res.status(200)
    .json(new ApiResponse(200,video[0],"Video fetched successfully"))
})

const updateVideo = asyncHandler(async (req, res) => {
    //TODO: update video details like title, description, thumbnail
    const {videoId} = req.params
    if(!videoId){
        throw new ApiError(400,"VideoId is required")
    }
    if(!mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError(400,"Invalid VideoId")
    }

    const {title , description} = req.body
    const thumbnail = req?.file
    if(!title && !description && !thumbnail){
        throw new ApiError(400,"At least one of the field is required")
    }
    let trimmedTitle;
    if(title !== null && title !== undefined){
        if(typeof title === "string"){
            trimmedTitle = title.trim()
            if(!trimmedTitle){
                throw new ApiError(400,"Title cannot be empty")
            }
        }else{
            throw new ApiError(400,"Title must be string")
        }
    }

        let trimmedDescription;
    if(description !== null && description !== undefined){
        if(typeof description === "string"){
            trimmedDescription = description.trim()
            if(!trimmedDescription){
                throw new ApiError(400,"Description cannot be empty")
            }
        }else{
            throw new ApiError(400,"Desciption must be string")
        }
    }
    let newThumbnail;
    try {
        const videoDoc = await Video.findById(videoId)
        if(!videoDoc){
            throw new ApiError(404,"Video not found")
        }
            
        if(!videoDoc.owner.equals(req.user._id)){
            throw new ApiError(403,"Forbidden request")
        }

        if(thumbnail){
            newThumbnail = await uploadMedia(thumbnail)
        }
        if(trimmedDescription){
            videoDoc.description = trimmedDescription
        }
        if(trimmedTitle){
            videoDoc.title = trimmedTitle
        }
        let oldThumbnail;
        if(newThumbnail){
            oldThumbnail = videoDoc.thumbnailPublicId
            videoDoc.thumbnailPublicId = newThumbnail.public_id
            videoDoc.thumbnail = newThumbnail.secure_url
        }
        await videoDoc.save()
        if(newThumbnail){
            await deleteMedia(oldThumbnail,"image")
        }
        const video = videoDoc.toObject()
        delete video.videoPublicId
        delete video.thumbnailPublicId
        res.status(200)
        .json(new ApiResponse(200,video,"Video updated successfully"))
    } catch (error) {
        if(newThumbnail?.public_id){
            await deleteMedia(newThumbnail.public_id,"image")
        }
        throw error
    }
})

const deleteVideoById = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    if(!videoId){
        throw new ApiError(400,"VideoId is required")
    }
    if(!mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError(400,"Invalid VideoId")
    }
    let videoDoc
    try {
        videoDoc = await Video.findOneAndDelete({
            _id: videoId,
            owner: req.user._id
        })
        if(!videoDoc){
            throw new ApiError(404,"Video not found")
        }
        await deleteMedia(videoDoc.thumbnailPublicId,"image")
        await deleteMedia(videoDoc.videoPublicId,"video")
        await User.updateMany(
            {watchHistory: videoDoc._id},
            {$pull: {watchHistory: videoDoc._id}}
        )
        res.status(200)
        .json(new ApiResponse(200,null,"Video deleted successfully"))
    } catch (error) {
        if(videoDoc?.thumbnailPublicId){
            await deleteMedia(videoDoc.thumbnailPublicId,"image")
        }
        if(videoDoc?.videoPublicId){
            await deleteMedia(videoDoc.videoPublicId,"video")
        }
        throw error
    }
    
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const  {videoId} = req.params
    if(!videoId){
        throw new ApiError(400,"VideoId is required")
    }
    if(!mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError(400,"Invalid VideoId")
    }
    const videoDoc = await Video.findById(videoId)
    if(!videoDoc){
        throw new ApiError(404,"Video not found")
    }
    if(!videoDoc.owner.equals(req.user._id)){
        throw new ApiError(403,"Forbidden request")
    }
    if(videoDoc.isPublished === true){
        videoDoc.isPublished = false
    }else{
        videoDoc.isPublished = true
    }
    await videoDoc.save()
    res.status(200)
    .json(new ApiResponse(200,{isPublished: videoDoc.isPublished},"Video status change successfully"))

})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideoById,
    togglePublishStatus
}