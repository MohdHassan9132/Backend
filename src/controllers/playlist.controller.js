import mongoose from "mongoose"
import { asyncHandler } from "../utils/async_handler.js"
import {ApiError} from '../utils/api_error.js'
import {ApiResponse} from '../utils/api_response.js'
import { Playlist } from "../models/playlist.model.js"
import {Video} from '../models/video.model.js'
import {deleteMedia, uploadMedia} from '../utils/cloudinary.js'

const createPlaylist = asyncHandler(async (req, res) => {
    //TODO: create playlist
    // await Playlist.collection.dropIndex("videos_1");
    const {name, description} = req.body
    const playlistCover = req.file
    const userId = req.user._id
    let trimmedName,trimmedDescription;
    if(typeof name !== "string"){
        throw new ApiError(400,"name must be string")
    }else{
        trimmedName = name.trim()
    }
    if(!trimmedName){
        throw new ApiError(400,"Name cannot be empty")
    }
    if(description){
        if(typeof description === "string"){
            trimmedDescription = description.trim()
        }
        if(!trimmedDescription){
            trimmedDescription = undefined
        }
    }
    let playlistCoverImage
    try {
        if(playlistCover){
            playlistCoverImage = await uploadMedia(playlistCover)
        }else{
            throw new ApiError(400,"PlaylistCoverImage is required")
        }
        const playlist = await Playlist.create({
            name: trimmedName,
            description: trimmedDescription,
            playlistCoverPublicId: playlistCoverImage.public_id,
            playlistCoverImage: playlistCoverImage.secure_url,
            owner: userId,
        })
        
        res.status(200)
        .json(new ApiResponse(200,playlist,"Playlist created successfully"))
    } catch (error) {
        if(playlistCoverImage?.public_id){
            await deleteMedia(playlistCoverImage.public_id,"image")
        }
    }
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    //TODO: get user playlists
    const {userId} = req.params
    if(!mongoose.Types.ObjectId.isValid(userId)){
        throw new ApiError(400,"Invalid UserId")
    }
    const playlists = await Playlist.find({
        owner: userId
    }).select("-playlistCoverPublicId").populate("owner","avatarUrl username")
    if(!playlists){
        throw new ApiError(404,"Playlists not found")
    }
    res.status(200)
    .json(new ApiResponse(200,playlists,"Users playlists fetched successfully"))
})

const getPlaylistById = asyncHandler(async (req, res) => {
    //TODO: get playlist by id
    const {playlistId} = req.params
    if(!mongoose.Types.ObjectId.isValid(playlistId)){
        throw new ApiError(400,"Invalid PlaylistId")
    }
    const playlist = await Playlist.aggregate([
        {
            $match: {_id: new mongoose.Types.ObjectId(playlistId)}
        },
        {
            $lookup:{
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "playlistVideos",
                pipeline:[
                    {
                        $match: {isPublished: true}
                    },
                    {
                        $lookup:{
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline:[
                                {
                                    $project:{
                                        avatar: 1,
                                        username: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $unwind: "$owner"
                    },
                    {
                        $project:{
                            videoFile: 1,
                            thumbnail: 1,
                            title: 1,
                            description: 1,
                            duration: 1,
                            views: 1,
                            owner: 1
                        }
                    }
                ]
            }
        },
        {
            $match: {
                playlistVideos:{$ne: []} 
            }
        },
        {
            $project:{
                playlistVideos: 1
            }
        }

    ])
    res.status(200)
    .json(new ApiResponse(200,playlist,"Playlist Fetched successfully"))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params
    const userId = req.user._id

    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiError(400, "Invalid PlaylistId")
    }
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid VideoId")
    }
    const isExist = await Video.exists(videoId)
    if(!isExist){
        throw new ApiError(404,"Video not found")
    }
    const playlist = await Playlist.findOneAndUpdate(
        {
            _id: playlistId,
            owner: userId, 
        },
        {
            $addToSet: { videos: videoId }
        },
        {
            new: true,              
            runValidators: false, 
        }
    ).select("-createdAt -updatedAt")

    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }

    res.status(200).json(
        new ApiResponse(200, playlist, "Playlist updated successfully")
    )
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    // TODO: remove video from playlist
    const {playlistId, videoId} = req.params
    const userId = req.user._id
    if(!mongoose.Types.ObjectId.isValid(playlistId)){
        throw new ApiError(400,"Invalid PlaylistId")
    }
    if(!mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError(400,"Invalid VideoId")
    }
    const playlist = await Playlist.findByIdAndUpdate(
        {
            _id: playlistId,
            owner: userId
        },
        {
            $pull: {videos: videoId}
        },
        {
            new: true,
            runValidators: false
        }
    ).select("-updatedAt -createdAt -__v")
    if(!playlist){
        throw new ApiError(404,"Playlist not found")
    }
    res.status(200)
    .json(new ApiResponse(200,playlist,"Video removed successfully"))

})

const deletePlaylist = asyncHandler(async (req, res) => {
    // TODO: delete playlist
    const {playlistId} = req.params
    const userId = req.user._id
    if(!mongoose.Types.ObjectId.isValid(playlistId)){
        throw new ApiError(400,"Invalid PlaylistId")
    }
    const playlist = await Playlist.findOneAndDelete(
        {
            _id: playlistId,
            owner: userId
        }
    )
    if(!playlist){
        throw new ApiError(404,"Playlist not found")
    }
    res.status(200)
    .json(new ApiResponse(200,null,"Playlist deleted successfully"))

})

const updatePlaylist = asyncHandler(async (req, res) => {
    //TODO: update playlist
    const {playlistId} = req.params
    const {name, description} = req.body
    const playlistCover = req?.file
    const userId = req.user._id
    if(!mongoose.Types.ObjectId.isValid(playlistId)){
        throw new ApiError(400,"Invalid PlaylistId")
    }
    let validName,validDescription
    if(typeof description === "string"){
        validDescription = description.trim()
    }else{
        throw new ApiError(400,"Description must be string")
    }
    if(!validDescription){
        throw new ApiError(400,"description cannot be empty")
    }
    if(typeof name === "string"){
        validName = name.trim()
        if(!validName){
            validName = undefined
        }
    }
    const playlistData = await Playlist.findById(playlistId).select("-createdAt -updatedAt")
    if(!playlistData){
        throw new ApiError(404,"Playlist not found")
    }
    if(!userId.equals(playlistData.owner)){
        throw new ApiError(403,"Forbidden request")
    }
    let playlistCoverImage;
    try {
        if(playlistCover){
            playlistCoverImage = await uploadMedia(playlistCover)
            const oldPlaylistCoverPublicId = playlistData?.playlistCoverPublicId
            playlistData.playlistCoverImage = playlistCoverImage.secure_url
            playlistData.playlistCoverPublicId = playlistCoverImage.public_id
            await deleteMedia(oldPlaylistCoverPublicId,"image")
        }
        if(validName){
            playlistData.name = validName
        }
        if(validDescription){
            playlistData.description = validDescription
        }
        await playlistData.save()
        const playlist = playlistData.toObject()
        delete playlist.playlistCoverPublicId
        res.status(200)
        .json(new ApiResponse(200,playlist,"Playlist updated successfully"))
    } catch (error) {
        if(playlistCoverImage?.public_id){
            await deleteMedia(playlistCoverImage.public_id,"image")
        }
        throw error
    }
    
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}