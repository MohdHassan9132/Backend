import { ApiResponse } from "../utils/api_response.js"
import { ApiError } from "../utils/api_error.js"
import { Video } from "../models/video.model.js"
import { asyncHandler } from "../utils/async_handler.js"
import { uploadVideo,uploadImage, deleteImage, deleteVideo } from "../utils/cloudinary.js"
import { User } from "../models/user.model.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
})

const publishAVideo = asyncHandler(async (req, res) => {
    const videoPath = req.files.video[0].path
    if(!videoPath){
        throw new ApiError(404,"Video file is required")
    }
    console.log("video path is valid",videoPath)
    const thumbnailPath = req.files.thumbnail[0].path
    if(!thumbnailPath){
        throw new ApiError(404,"Thumbnail is required")
    }
    console.log("thumnail path is valid",thumbnailPath)
    const { title, description} = req.body
    if(!title){
        throw new ApiError(404,"Title is required")
    }
    console.log("title is valid",title)
    const video = await uploadVideo(videoPath)
    console.log("video uploaded successfully",video)
    const videoPublicId = video.public_id
    const videoSecureUrl = video.secure_url
    console.log(videoPublicId,videoSecureUrl)
    if(!videoPublicId || !videoSecureUrl){
        throw new ApiError(500,"Video Upload failed")
    }
    
    const thumbnail = await uploadImage(thumbnailPath)
    console.log("thumnail uploades successfully",thumbnail)
    const thumbnailPublicId = thumbnail.public_id
    const thumbnailSecureUrl = thumbnail.secure_url
    if(!thumbnailPublicId || !thumbnailSecureUrl){
        throw new ApiError(500,"Thumbnail upload failed")
    }
    const videoDoc = await Video.create({videoFile: videoSecureUrl,videoPublicId,thumbnail: thumbnailSecureUrl, thumbnailPublicId,title,description,owner: req.user._id,duration: video.duration
    })
    console.log("video doc created successfully",videoDoc)
    if(!videoDoc){
        throw new ApiError(500,"Error while creating the video doc")
    }
    res.status(201)
    .json(new ApiResponse(201,videoDoc,"Video published successfully"))
    
})

const getVideoById = asyncHandler(async (req, res) => {
    const  videoId  =new mongoose.Types.ObjectId(req.params._id)
    const userId = new mongoose.Types.ObjectId(req.user._id)
    const video = await Video.aggregate([
        {
            $match: {_id: videoId}
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
                    }

                ],
            }
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
    const videoId  = req.params._id
    console.log(videoId)
    const videoDoc = await Video.findById(videoId)
    console.log(videoDoc)
    if(!videoDoc.owner.equals(req.user._id)){
        throw new ApiError(401,"Unauthorized access")
    }
    //TODO: update video details like title, description, thumbnail
    const {title , description} = req.body
    const thumbnailPath = req.file?.path
    if(!title && !description && !thumbnailPath){
        throw new ApiError(400,"At least one of the field is required")
    }
    if(thumbnailPath){
        const newThumbnail = await uploadImage(thumbnailPath)
        if(!newThumbnail){
            throw new ApiError(500,"Thumbnail upload failed")
        }
        const newThumbnailUrl = newThumbnail.secure_url
        const newThumbnailPublicId = newThumbnail.public_id
        videoDoc.thumbnail = newThumbnailUrl
        videoDoc.thumbnailPublicId = newThumbnailPublicId
    }
    if(title!== "" && title !== undefined){
        videoDoc.title = title
    }
    if(description!== "" && description!== undefined){
        videoDoc.description = description
    }
    videoDoc.save({validateBeforeSave: false})
    console.log(videoDoc)
    const video = videoDoc.toObject()
    delete video.thumbnailPublicId
    delete video.videoPublicId
    console.log(video)
    res.status(200)
    .json(new ApiResponse(200,video,"Video updated successfully"))
    

})

const deleteVideoById = asyncHandler(async (req, res) => {
    const videoId = req.params._id
    const videoDoc = await Video.findById(videoId)
    if(!videoDoc){
        throw new ApiError(404,"Video not found")
    }
    if(videoDoc.owner.toString()!== req.user._id.toString()){
        throw new ApiError(401,"Unauthorized Access")
    }
    await deleteImage(videoDoc.thumbnailPublicId)
    await deleteVideo(videoDoc.videoPublicId)
    await User.updateMany(
        {watchHistory: videoDoc._id},
        {$pull: {watchHistory: videoDoc._id}}
    )
    await videoDoc.deleteOne()

    res.status(200)
    .json(new ApiResponse(200,null,"Video deleted successfully"))
    
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const  videoId = req.params._id
    const videoDoc = await Video.findById(videoId)
    if(!videoDoc.owner.equals(req.user._id)){
        throw new ApiError(401,"Unauthorized Access")
    }
    console.log(videoDoc)
    if(videoDoc.isPublished === true){
        videoDoc.isPublished = false
    }else{
        videoDoc.isPublished = true
    }
    await videoDoc.save({validateBeforeSave: false})
    console.log(videoDoc)
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