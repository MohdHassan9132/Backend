import { Router } from "express";
import { changeCurrentPassword, getUser, getUserChannelProfile, getUserWatchHistory, loginUser, logoutUser, refreshAccessToken, registerUser, UpdateUserAvatar, updateUserDetails, UpdatUserCoverImage } from "../controllers/user.controller.js";
import {upload} from '../middlewares/multer.middleware.js'
import { verifyJWT } from "../middlewares/auth.middleware.js";
const userRouter = Router()
userRouter.route("/register").post(upload.fields([
    {
        name: 'avatar',
        maxCount: 1,
    },
    {
        name: "coverImage",
        maxCount: 1
    }
]),registerUser)
userRouter.route("/login").post(loginUser)
userRouter.route("/logout").post(verifyJWT,logoutUser)
userRouter.route("/getUser").get(verifyJWT,getUser)
userRouter.route("/refreshAccessToken").post(refreshAccessToken)
userRouter.route("/updateUserDetails").patch(verifyJWT,updateUserDetails)
userRouter.route("/changeCurrentPassword").post(verifyJWT,changeCurrentPassword)
userRouter.route("/updateUserAvatar").patch(verifyJWT,upload.single('avatar'),UpdateUserAvatar)
userRouter.route("/updateUserCoverImage").patch(verifyJWT,upload.single('coverImage'),UpdatUserCoverImage)
userRouter.route("/getUserChannelProfile/:username").get(verifyJWT,getUserChannelProfile)
userRouter.route("/getUserWatchHistory").get(verifyJWT,getUserWatchHistory)

export {userRouter}