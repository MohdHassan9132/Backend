import mongoose, { Schema } from "mongoose"

const videoViewSchema = new Schema({
    video: {
        type: Schema.Types.ObjectId,
        ref: "Video",
        required: true
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 }
    }
})

export const VideoView = mongoose.model("VideoView", videoViewSchema)
