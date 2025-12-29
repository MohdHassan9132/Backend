import { User } from "../models/user.model.js";
import { ApiError } from "../utils/api_error.js";
import { asyncHandler } from "../utils/async_handler.js";
import jwt from 'jsonwebtoken'

const verifyJWT = asyncHandler(async(req,res,next)=>{
    const token = req.cookies?.accessToken
    if(!token){
        throw new ApiError(401,"Unauthorized Access")
    }
    const tokenData = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
    if(!tokenData){
        throw new ApiError(401,"Invalid Access Token")
    }
    const user = await User.findById(tokenData._id)
    if(!user){
        throw new ApiError(401,"User not longer exists")
    }
    req.user = user
    console.log(req.user)
    next()
})

export {verifyJWT}