import {asyncHandler} from '../utils/async_handler.js'
import { ApiResponse } from '../utils/api_response.js'
import {ApiError} from '../utils/api_error.js'
import { uploadMedia,deleteMedia } from '../utils/cloudinary.js'
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
    if([username,email,fullName,password].some(fields => !fields || !fields.trim())){
        throw new ApiError(400,"All fields are required")
    }

    const isUser = await User.findOne({
        $or: [{username},{email}]
    })

    if(isUser){
        throw new ApiError(409,"User already exists")
    }
    
    const avatar = req?.files?.avatar

    if(!avatar || avatar.length === 0){
        throw new ApiError(400,"Avatar is required")
    }
    let avatarImage,uploadedCoverImage;
 try {
        avatarImage = await uploadMedia(avatar[0])
        const coverImage = req?.files?.coverImage
        if(coverImage && coverImage.length >=  1){
            uploadedCoverImage = await uploadMedia(coverImage[0])
        }
   
        const user = await User.create({
            username,email,fullName,password,coverImage: uploadedCoverImage?.secure_url,coverImagePublicId: uploadedCoverImage?.public_id,avatar: avatarImage.secure_url,avatarPublicId: avatarImage.public_id
        })
        
        const userData = user.toObject()
        delete userData.coverImagePublicId
        delete userData.avatarPublicId
        delete userData.password
        delete userData.watchHistory
        
        res.status(201)
        .json(new ApiResponse(201,userData,"User registered successfully"))
    } catch (error) {
        if(uploadedCoverImage?.public_id){
            await deleteMedia(uploadedCoverImage.public_id,"image")
        }
        if(avatarImage?.public_id){
            await deleteMedia(avatarImage.public_id,"image")
        }
        throw error
    }
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

    const username = req.body.username 
    const password = req.body.password
    const email = req.body.email 
    if(!username && !email){
        throw new ApiError(400,"Email or username is required")
    }
    let trimmedUsername,trimmedEmail;
   if(username!==undefined && username!== null){
        if(typeof username === "string"){
            trimmedUsername = username.trim().toLowerCase()
        }else{
            throw new ApiError(400,"username must be string")
        }
        if(!trimmedUsername){
            throw new ApiError(400,"Username cannot be empty")
        }
   }
   if(email !== undefined && email !== null){
        if(typeof email === "string"){
            trimmedEmail = email.trim().toLowerCase()
        }else{
            throw new ApiError(400,"email must be string")
        }
        if(!trimmedEmail){
            throw new ApiError(400,"Email cannot be empty")
        }
   }
    let trimmedPassword;
    if(!password){
        throw new ApiError(400,"password is required")
    }
    if(typeof password === "string"){
        trimmedPassword = password.trim()
        if(!trimmedPassword){
            throw new ApiError(400,"Password cannot be empty")
        }
    }else{
        throw new ApiError(400,"Password must be string")
    }

    const userData = await User.findOne({
        $or: [
            {username: trimmedUsername},
            {email: trimmedEmail}
        ]
    })

    if(!userData){
        throw new ApiError(404,"No User found")
    }

    const isCorrect = await userData.isPasswordCorrect(trimmedPassword)

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
    const user = await User.findById(tokenData._id)
    if(!user){
        throw new ApiError(404,"User not found")
    }
    if(user.refreshToken !== token){
        throw new ApiError(401,"token mismatch")
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
    let trimmedEmail,trimmedUsername
    if(username !== undefined && username!= null){
        if(typeof username === "string"){
            trimmedUsername = username.trim().toLowerCase()
        }else{
            throw new ApiError(400,"Username must be string")
        }
        if(!trimmedUsername){
            throw new ApiError(400,"Username cannot be empty")
        }else{
            updateDetails.username = trimmedUsername
        }
    }
    if(email !== undefined && email!== null){
        if(typeof email === "string"){
            trimmedEmail = email.trim().toLowerCase()
        }else{
            throw new ApiError(400,"email must be string")
        }
        if(!trimmedEmail){
            throw new ApiError(400,"Email cannot be empty")
        }else{
            updateDetails.email = trimmedEmail
        }
    }
    if(Object.keys(updateDetails).length === 0){
        throw new ApiError(400,"No valid field to updated")
    }
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
    let currentTrimmedPassword,newTrimmedPassowrd;
    if(typeof currentPassword === "string" && typeof newPassword === "string"){
        currentTrimmedPassword = currentPassword.trim()
        newTrimmedPassowrd = newPassword.trim()
        if(!newTrimmedPassowrd||!currentTrimmedPassword){
            throw new ApiError(400,"Passwords cannot be empty")
        }
    }else{
        throw new ApiError(400,"Current password and new passowrd must be string")
    }
    if(currentTrimmedPassword === newTrimmedPassowrd){
        throw new ApiError(400,"New password must be different from previous")
    }
    const isCorrect = await userData.isPasswordCorrect(currentTrimmedPassword)
    if(!isCorrect){
        throw new ApiError(403,"Passowrd is incorrect")
    }
    userData.password = newTrimmedPassowrd
    await userData.save()
    res.status(200)
    .json(new ApiResponse(200,null,"User password updated successfully"))
})

const UpdateUserAvatar = asyncHandler(async(req,res)=>{
    const userData = req.user
    const avatar = req?.file
    if(!avatar){
        throw new ApiError(400,"Avatar is required")
    }
    let newAvatar;
    try {
        newAvatar = await uploadMedia(avatar)
        const oldAvatar = userData.avatarPublicId
        userData.avatarPublicId = newAvatar.public_id
        userData.avatar = newAvatar.secure_url
        await userData.save()
        if(oldAvatar){
            await deleteMedia(oldAvatar,"image")
        }
        res.status(200)
        .json(new ApiResponse(200,newAvatar.secure_url,"Avatar updated successfully"))
    } catch (error) {
        if(newAvatar?.public_id){
            await deleteMedia(newAvatar.public_id,"image")
        }
        throw error
    }
})

const updatUserCoverImage = asyncHandler(async(req,res)=>{
    const userData = req.user
    const coverImage = req?.file
    if(!coverImage){
        throw new ApiError(400,"coverImage is required")
    }
    let newCoverImage
    try {
        newCoverImage = await uploadMedia(coverImage)
        const oldCoverImage = userData.coverImagePublicId
        userData.coverImagePublicId = newCoverImage.public_id
        userData.coverImage = newCoverImage.secure_url
        await userData.save()
        if(oldCoverImage){
            await deleteMedia(oldCoverImage,"image")
        }
        res.status(200)
        .json(new ApiResponse(200,newCoverImage.secure_url,"CoverImage updated successfully"))
    } catch (error) {
        if(newCoverImage?.public_id){
            await deleteMedia(newCoverImage.public_id,"image")
        }
        throw error
    }
    res.status(200)
    .json(new ApiResponse(200,coverImage,"Coverimage recieved"))
})

const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const userId = req.user._id
    if(!req.params.username){
        throw new ApiError(400,"username is required")
    }
    const {username}  = req.params
    let trimmedUsername;
    if(typeof username === "string"){
        trimmedUsername = username.trim().toLowerCase()
        if(!trimmedUsername){
            throw new ApiError(400,"username cannot be empty")
        }
    }else{
        throw new ApiError(400,"username must be string")
    }
    const channel = await User.aggregate([
        {
            $match: {username: trimmedUsername}
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

export{registerUser,loginUser,logoutUser,getUser,refreshAccessToken,updateUserDetails,changeCurrentPassword,UpdateUserAvatar,updatUserCoverImage,getUserChannelProfile,getUserWatchHistory}