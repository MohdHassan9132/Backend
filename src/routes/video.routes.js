import { Router } from "express";
import {deleteVideoById, getAllVideos, getVideoById, publishAVideo, togglePublishStatus, updateVideo } from "../controllers/video.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const videoRouter = Router()
videoRouter.route("/getAllVideos").get(verifyJWT,getAllVideos)
videoRouter.route("/publishAVideo").post(upload.fields([
    {
        name: "video",
        maxCount: 1
    },
    {
        name: "thumbnail",
        maxCount: 1
    }
]),verifyJWT,publishAVideo)
videoRouter.route("/getVideoById/:_id").get(verifyJWT,getVideoById)
videoRouter.route("/updateVideo/:_id").patch(upload.single('thumbnail'),verifyJWT,updateVideo)
videoRouter.route("/deleteVideo/:_id").delete(verifyJWT,deleteVideoById)
videoRouter.route("/togglePublishStatus/:_id").patch(verifyJWT,togglePublishStatus)

export{videoRouter}