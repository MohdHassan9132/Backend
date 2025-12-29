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
videoRouter.route("/getVideoById/:videoId").get(verifyJWT,getVideoById)
videoRouter.route("/updateVideo/:videoId").patch(upload.single('thumbnail'),verifyJWT,updateVideo)
videoRouter.route("/deleteVideo/:videoId").delete(verifyJWT,deleteVideoById)
videoRouter.route("/togglePublishStatus/:videoId").patch(verifyJWT,togglePublishStatus)

export{videoRouter}