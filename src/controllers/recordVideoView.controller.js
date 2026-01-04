import { ApiResponse } from "../utils/api_response.js"
import { ApiError } from "../utils/api_error.js"
import { Video } from "../models/video.model.js"
import { VideoView } from "../models/videoView.model.js"
import { asyncHandler } from "../utils/async_handler.js"
import mongoose from "mongoose"

const recordVideoView = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!videoId) {
        throw new ApiError(400, "VideoId is required")
    }

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid VideoId")
    }

    const video = await Video.findById(videoId).select("duration")

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    const userId = req.user._id

    const existingView = await VideoView.findOne({
        video: video._id,
        user: userId
    })

    if (existingView) {
        return res
            .status(200)
            .json(new ApiResponse(200, null, "View already counted"))
    }

    const expiresAt = new Date(Date.now() + video.duration * 1000)

    await VideoView.create({
        video: video._id,
        user: userId,
        expiresAt
    })

    await Video.findByIdAndUpdate(video._id, {
        $inc: { views: 1 }
    })

    res
        .status(200)
        .json(new ApiResponse(200, null, "View recorded successfully"))
})

export { recordVideoView }
