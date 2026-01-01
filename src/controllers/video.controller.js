import { ApiResponse } from "../utils/api_response.js"
import { ApiError } from "../utils/api_error.js"
import { Video } from "../models/video.model.js"
import { asyncHandler } from "../utils/async_handler.js"
import { uploadMedia,deleteMedia } from "../utils/cloudinary.js"
import { User } from "../models/user.model.js"
import mongoose from "mongoose"



// const getAllVideos = asyncHandler(async (req, res) => {
//     const { page , limit , query, sortBy, sortType, userId } = req.query
//     //TODO: get all videos based on query, sort, pagination
//     const variables = {}
//     const parsedPage = Number(page)
//     variables.page =  Number.isFinite(parsedPage) && parsedPage>=1 ? parsedPage : 1
    
//     const parsedLimit = Number(limit)
//     variables.limit = Number.isFinite(parsedLimit) && parsedLimit>=1 ? parsedLimit : 10

//     const trimmedSortType = typeof(sortType) === "string" ? sortType.trim() : ""
//     variables.sortType = (trimmedSortType=== "asc" || trimmedSortType === "desc") ? trimmedSortType : "asc" 

//     variables.sortBy = typeof(sortBy) === "string" && sortBy.trim() ? sortBy.trim() : "createdAt"

//    if(typeof(query) === "string" && query.trim()){
//     variables.query = query.trim()
//    }
//    if(typeof(userId) === "string" && mongoose.Types.ObjectId.isValid(userId)){
//     variables.userId = new mongoose.Types.ObjectId(userId)
//    }

//    const pipeline = []
//    //query , id, sort , paginate
//    if (variables.userId) {
//   pipeline.push({
//     $match: { owner: variables.userId }
//   });

//   if (variables.query) {
//     pipeline.push({
//       $match: {
//         $or: [
//           { title: { $regex: variables.query, $options: "i" } },
//           { description: { $regex: variables.query, $options: "i" } }
//         ]
//       }
//     });
//   }

// } else if (variables.query) {
//   pipeline.push({
//     $match: {
//       $or: [
//         { title: { $regex: variables.query, $options: "i" } },
//         { description: { $regex: variables.query, $options: "i" } }
//       ]
//     }
//   });
// }

//    pipeline.push({
//     $sort:{
//         [variables.sortBy]: variables.sortType === "asc" ? 1 : -1
//     }
//    })

//    pipeline.push(
//     {$skip:(variables.page-1)*variables.limit},
//     {$limit: variables.limit}
//    )
//    pipeline.push({
//         $lookup:{
//             from: "users",
//             localField: "owner",
//             foreignField: "_id",
//             as: "owner"
//         }
//     })
//     pipeline.push({
//         $unwind: "$owner"
//     })
//     pipeline.push({
//         $project:{
//             _id: 1,
//             videoFile: 1,
//             thumbnail: 1,
//             title: 1,
//             description: 1,
//             duration: 1,
//             views: 1,
//             isPublished: 1,
//             owner:{
//                 _id: "$owner._id",
//                 username: "$owner.username",
//                 avatar: "$owner.avatar"
//             }

//         }
//     })
//    const videos = await Video.aggregate(pipeline)
//    console.log(videos)
//    res.status(200)
//    .json(new ApiResponse(200,videos,"Fetched the videos successfully"))

// })

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
    // TODO: get all videos based on query, sort, pagination
    // NOTE: page & limit are strings from params and need int conversion to be used here in calcs
    let pageValue = parseInt(page);
    let limitValue = parseInt(limit);
    let filter = new Object();
    let normalizedSortType = sortType?.toLowerCase().trim();
    let sortOptions = new Object();

    if (userId && userId.trim()) {
        filter.owner = userId;
    }

    if (query && query?.trim()) {
        filter.$or = [
            { title: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } },
        ];
    }

    // Incremental filter building implicitly handles the case when user provides both userId & query

    if (sortBy?.trim() && normalizedSortType) {
        const validSortFields = ["createdAt", "views", "duration"];

        if (validSortFields.includes(sortBy)) {
            if (normalizedSortType !== "asc" && normalizedSortType !== "desc") {
                normalizedSortType = "asc";
            }
            sortOptions[sortBy] = normalizedSortType === "asc" ? 1 : -1;
        }
    } else if (sortBy?.trim()) {
        const validSortFields = ["createdAt", "views", "duration"];
        if (validSortFields.includes(sortBy)) {
            sortOptions[sortBy] = -1;
        }
    } else if (normalizedSortType) {
        if (normalizedSortType === "asc") {
            sortOptions = { views: 1 };
        }
    } else {
        sortOptions = { views: -1 };
    }

    const totalMatchedVideoCount = await Video.countDocuments(filter);

    const totalPages = Math.ceil(totalMatchedVideoCount / limitValue);

    if (pageValue <= 0 || isNaN(pageValue)) pageValue = 1;
    if (limitValue <= 0 || limitValue >= 1000 || isNaN(limitValue))
        limitValue = 10;

    if (pageValue > totalPages) {
        throw new ApiError(400, "Out of range page requested!");
    }
    const currentPageVideos = await Video.find(filter)
        .sort(sortOptions)
        .skip((pageValue - 1) * limitValue)
        .limit(limitValue);

    if (!currentPageVideos.length) {
        throw new ApiError(404, "No videos found!");
    }

    const pagination = {
        currentPage: pageValue,
        perPage: limitValue,
        totalItems: totalMatchedVideoCount,
        totalPages: totalPages,
        hasPrevPage: pageValue > 1,
        hasNextPage: pageValue < totalPages,
    };
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { videos: currentPageVideos, pagination: pagination },
                "Videos fetched successfully"
            )
        );
});

const publishAVideo = asyncHandler(async (req, res) => {
    const videoPath = req.files.video[0].path
    if(!videoPath){
        throw new ApiError(404,"Video file is required")
    }
    
    const thumbnailPath = req.files.thumbnail[0].path
    if(!thumbnailPath){
        throw new ApiError(404,"Thumbnail is required")
    }

    const { title, description} = req.body
    if(!title){
        throw new ApiError(404,"Title is required")
    }

    const video = await uploadMedia(videoPath)

    const videoPublicId = video.public_id
    const videoSecureUrl = video.secure_url

    if(!videoPublicId || !videoSecureUrl){
        throw new ApiError(500,"Video Upload failed")
    }
    
    const thumbnail = await uploadMedia(thumbnailPath)

    const thumbnailPublicId = thumbnail.public_id
    const thumbnailSecureUrl = thumbnail.secure_url
    if(!thumbnailPublicId || !thumbnailSecureUrl){
        throw new ApiError(500,"Thumbnail upload failed")
    }
    const videoDoc = await Video.create({videoFile: videoSecureUrl,videoPublicId,thumbnail: thumbnailSecureUrl, thumbnailPublicId,title,description,owner: req.user._id,duration: video.duration
    })

    if(!videoDoc){
        throw new ApiError(500,"Error while creating the video doc")
    }
    res.status(201)
    .json(new ApiResponse(201,videoDoc,"Video published successfully"))
    
})

const getVideoById = asyncHandler(async (req, res) => {
    const  videoId  = new mongoose.Types.ObjectId(req.params.videoId)
    const userId = req.user._id
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
    const {videoId}  = req.params
    if(!videoDoc.owner.equals(req.user._id)){
        throw new ApiError(401,"Unauthorized access")
    }
    const videoDoc = await Video.findById(videoId)
    //TODO: update video details like title, description, thumbnail
    const {title , description} = req.body
    const thumbnailPath = req.file?.path
    if(!title && !description && !thumbnailPath){
        throw new ApiError(400,"At least one of the field is required")
    }
    if(thumbnailPath){
        const newThumbnail = await uploadMedia(thumbnailPath)
        if(!newThumbnail){
            throw new ApiError(500,"Thumbnail upload failed")
        }
        if(videoDoc.thumbnailPublicId){
            await deleteMedia(videoDoc.thumbnailPublicId,"image")
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
    await videoDoc.save({validateBeforeSave: false})

    const video = videoDoc.toObject()
    delete video.thumbnailPublicId
    delete video.videoPublicId

    res.status(200)
    .json(new ApiResponse(200,video,"Video updated successfully"))
    

})

const deleteVideoById = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const videoDoc = await Video.findById(videoId)
    if(!videoDoc){
        throw new ApiError(404,"Video not found")
    }
    if(videoDoc.owner.toString()!== req.user._id.toString()){
        throw new ApiError(401,"Unauthorized Access")
    }
    await deleteMedia(videoDoc.thumbnailPublicId,"image")
    await deleteMedia(videoDoc.videoPublicId,"video")
    await User.updateMany(
        {watchHistory: videoDoc._id},
        {$pull: {watchHistory: videoDoc._id}}
    )
    await videoDoc.deleteOne()

    res.status(200)
    .json(new ApiResponse(200,null,"Video deleted successfully"))
    
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const  {videoId} = req.params
    if(!mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError(400,"Invalid VideoId")
    }
    const videoDoc = await Video.findById(videoId)
    if(!videoDoc){
        throw new ApiError(404,"Video not found")
    }
    if(!videoDoc.owner.equals(req.user._id)){
        throw new ApiError(401,"Unauthorized Access")
    }

    if(videoDoc.isPublished === true){
        videoDoc.isPublished = false
    }else{
        videoDoc.isPublished = true
    }
    await videoDoc.save({validateBeforeSave: false})

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