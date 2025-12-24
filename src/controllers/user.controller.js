import {asyncHandler} from '../utils/async_handler.js'
import { ApiResponse } from '../utils/api_response.js'
import {ApiError} from '../utils/api_error.js'
import { uploadImage,deleteImage } from '../utils/cloudinary.js'
import {User} from '../models/user.model.js'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'

const cookieOptions = {
    httpOnly: true,
    secure: true
}

const refreshAccessAndRefreshToken = async(userId)=>{
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})
        return{accessToken: accessToken,
            refreshToken: refreshToken
        }
    } catch (error) {
        throw new ApiError(500,"Error while generating tokens")
    }
}

const registerUser = asyncHandler(async(req,res)=>{
    //take value from fields
    //validate the fields
    //check if the user exists
    //check for avatar and coverImage
    //upload on cloudinary avatar and coverImage
    //create the user in the db
    //return the response without sensitive fields
    const {username,email,fullName,password} = req.body
    if([username,email,fullName,password].some(fields => !fields)){
        throw new ApiError(400,"All fields are required")
    }

    const isUser = await User.findOne({
        $or: [{username},{email}]
    })

    if(isUser){
        throw new ApiError(409,"User already exists")
    }

    const avatarPath = req.files?.avatar[0]?.path

    if(!avatarPath){
        throw new ApiError(400,"Avatar is required")
    }

    const avatar = await uploadImage(avatarPath)
    const avatarPublicId = avatar.public_id
    const avatarUrl = avatar.secure_url
    if(!avatarPublicId || !avatarUrl){
        throw new ApiError(500,"Avatar upload failed")
    }

    const coverImagePath = req.files?.coverImage[0]?.path
    let coverImageUrl;
    let coverImagePublicId;
    
    if(coverImagePath){
        const coverImage = await uploadImage(coverImagePath)
        coverImageUrl = coverImage.secure_url
        coverImagePublicId = coverImage.public_id
        if(!coverImageUrl || !coverImagePublicId){
            throw new ApiError(500,"CoverImage upload failed")
        }
    }

    const user = await User.create({
        username,email,fullName,password,coverImage: coverImageUrl,coverImagePublicId,avatar: avatarUrl,avatarPublicId
    })

    const userData = user.toObject()
    delete userData.coverImagePublicId
    delete userData.avatarPublicId
    delete userData.password
    delete user.watchHistory

    res.
    status(200)
    .json(new ApiResponse(200,userData,"User registered successfully"))
})

const loginUser = asyncHandler(async(req,res)=>{
    //get username or email and password 
    //check for the fields
    //get the user
    //compare password
    //generate the tokens
    //set the tokens as cookie
    //save the refresh in the doc
    //return the response

    const {username,email,password} = req.body
    if(!username && !email){
        throw new ApiError(400,"Email or username is required")
    }

    if(!password){
        throw new ApiError(400,"Password is required")
    }

    const userData = await User.findOne({
        $or: [{username},{email}]
    })

    if(!userData){
        throw new ApiError(404,"No User found")
    }

    const isCorrect = await userData.isPasswordCorrect(password)

    if(!isCorrect){
        throw new ApiError(401,"Invalid Credentials")
    }

    const {refreshToken,accessToken} = await refreshAccessAndRefreshToken(userData._id)

    const user = userData.toObject()
    delete user.avatarPublicId
    delete user.coverImagePublicId
    delete user.password
    delete user.refreshToken
    delete user.watchHistory

    res.status(200)
    .cookie("refreshToken",refreshToken,cookieOptions)
    .cookie("accessToken",accessToken,cookieOptions)
    .json(new ApiResponse(200,user,"User logged in successfully"))
})

const logoutUser = asyncHandler(async(req,res)=>{
    //get the user
    //clear the cookie
    //clear the refreshToken in db
    //return the response
    const user = req.user
    user.refreshToken = ""
    await user.save({validateBeforeSave: false})
    res.status(200)
    .clearCookie("refreshToken",cookieOptions)
    .clearCookie("accessToken",cookieOptions)
    .json(new ApiResponse(200,null,"User logged out successfully"))

})

const getUser = asyncHandler(async(req,res)=>{
    //verify the user get the user object and pass it into the response
    const userData = req.user
    const user = userData.toObject()
    delete user.avatarPublicId
    delete user.coverImagePublicId
    delete user.refreshToken
    delete user.password
    delete user.watchHistory
    res.status(200)
    .json(new ApiResponse(200,user,"User fetched successfully"))
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
    //check for refreshToken
    //generate both token and return the response
    const token = req.cookies.refreshToken
    if(!token){
        throw new ApiError(401,"Unauthorized Access")
    }
    const tokenData = jwt.verify(token,process.env.REFRESH_TOKEN_SECRET)
    if(!tokenData){
        throw new ApiError(401,"Invalid refresh token")
    }
    const {refreshToken,accessToken} = await refreshAccessAndRefreshToken(tokenData._id)
    res.status(200)
    .cookie("refreshToken",refreshToken,cookieOptions)
    .cookie("accessToken",accessToken,cookieOptions)
    .json(new ApiResponse(200,{refreshToken,accessToken},"Access token refresh successfully"))
    
})

const updateUserDetails = asyncHandler(async(req,res)=>{
    //check for the fields
    //check if the user exists 
    //check if their is another user with that fields
    //update the user fields
    //return the response
    const userData = req.user
    const {username,email}  = req.body
    if(!username && !email){
        throw new ApiError(400,"At least one field is required")
    }
    const updateDetails = {}
    if(username !== undefined){updateDetails.username = username}
    if(email !== undefined){updateDetails.email = email}
    const updatedUser = await User.findByIdAndUpdate(userData._id,updateDetails,{new: true})
    if(!updatedUser){
        throw new ApiError(404,"user not found")
    }
    const user  = updatedUser.toObject()
    delete user.password
    delete user.refreshToken
    delete user.avatarPublicId
    delete user.coverImagePublicId
    delete user.watchHistory
    res.status(200)
    .json(new ApiResponse(200,user,"User updated successfully"))

})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
    //get the current and new password
    //check if the current is same in db
    //add the new password to db
    const userData = req.user
    const {currentPassword,newPassword} = req.body
    if(!currentPassword || !newPassword){
        throw new ApiError(400,"All fields are required")
    }
    const isCorrect = await userData.isPasswordCorrect(currentPassword)
    if(!isCorrect){
        throw new ApiError(401,"Passowrd is incorrect")
    }
    userData.password = newPassword
    await userData.save({validateBeforeSave: false})
    res.status(200)
    .json(new ApiResponse(200,null,"User password updated successfully"))

})

const UpdateUserAvatar = asyncHandler(async(req,res)=>{
    const userData = req.user
    const avatarPath = req.file.path;
    if(!avatarPath){
        throw new ApiError(400,"Avatar is required")
    }
    const avatar = await uploadImage(avatarPath)
    const avatarPublicId = avatar.public_id
    const avatarUrl = avatar.secure_url
    if(!avatarPublicId || !avatarUrl){
        throw new ApiError(500,"Avatar upload failed")
    }
    const oldAvatar = userData.avatarPublicId
    userData.avatarPublicId = avatarPublicId
    userData.avatar = avatarUrl
    await userData.save({validateBeforeSave: false})
    const isDeleted = await deleteImage(oldAvatar)
    console.log(isDeleted)
    res.status(200)
    .json(new ApiResponse(200,avatarUrl,"Avatar updated successfully"))
})

const UpdatUserCoverImage = asyncHandler(async(req,res)=>{
    const userData = req.user
    const coverImagePath = req.file.path;
    if(!coverImagePath){
        throw new ApiError(400,"coverImage is required")
    }
    const coverImage = await uploadImage(coverImagePath)
    const coverImagePublicId = coverImage.public_id
    const coverImageUrl = coverImage.secure_url
    if(!coverImagePublicId || !coverImageUrl){
        throw new ApiError(500,"CoverImage upload failed")
    }
    const oldCoverImage = userData.coverImagePublicId
    userData.coverImagePublicId = coverImagePublicId
    userData.coverImage = coverImageUrl
    await userData.save({validateBeforeSave: false})
    const isDeleted = await deleteImage(oldCoverImage)
    console.log(isDeleted)
    res.status(200)
    .json(new ApiResponse(200,coverImageUrl,"Avatar updated successfully"))
})

const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const userId = new mongoose.Types.ObjectId(req.user._id)
    const {username}  = req.params
    const channel = await User.aggregate([
        {
            $match: {username}
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribersCount"
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedToCount"
            }
        },
        {
            $addFields:{
                subscribers: {$size: "$subscribersCount"},
                subscribedTo: {$size: "$subscribedToCount"},
                isSubscribed: {
                    $cond: {
                        if:{$in:[userId,"$subscribersCount.subscriber"]},
                        then: 1,
                        else: 0
                    }
                }
            }
        },
        {
            $project:{
                username: 1,
                avatar: 1,
                coverImage: 1,
                subscribers: 1,
                subscribedTo: 1,
                isSubscribed: 1,

            }
        }
    ])
    if(channel.length === 0){
        throw new ApiError(404,"No channel found")
    }
    res.status(200)
    .json(new ApiResponse(200,channel[0],"User channel fetched successfully"))
})

const getUserWatchHistory = asyncHandler(async(req,res)=>{
    const userWatchHistory = await User.aggregate([
        {
            $match:{_id: new mongoose.Types.ObjectId(req.user._id)}
        },
        {
            $lookup:{
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline:[
                                {
                                    $project:{
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $unwind:{
                            path: "$owner",
                            preserveNullAndEmptyArrays: true
                        }
                    },
                    {
                        $project:{
                            videoFile: 1,
                            thumbnail: 1,
                            description: 1,
                            title: 1,
                            duration: 1,
                            isPublished: 1,
                            views: 1,
                            owner: 1
                        }
                    }
                ],
                
            }
        },
        {
            $project: {
                watchHistory: 1
            }
        }
    ])
    if(userWatchHistory.length === 0){
        throw new ApiError(404,"No user watch History found")
    }

    res.status(200)
    .json(new ApiResponse(200,userWatchHistory[0],"User watch history fetched successfully"))
})

export{registerUser,loginUser,logoutUser,getUser,refreshAccessToken,updateUserDetails,changeCurrentPassword,UpdateUserAvatar,UpdatUserCoverImage,getUserChannelProfile,getUserWatchHistory}