import mongoose , {Schema} from "mongoose";
import {ApiError} from '../utils/api_error.js'
const likeSchema = new Schema({
    comment:{
        type: Schema.Types.ObjectId,
        ref: "Comment"
    },
    video:{
        type: Schema.Types.ObjectId,
        ref: "Video"
    },
    likedBy:{
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    tweet:{
        type: Schema.Types.ObjectId,
        ref: "Tweet"
    }
},{timestamps: true})

likeSchema.index(
  { video: 1, likedBy: 1 },
  { unique: true, partialFilterExpression: { video: { $exists: true } } }
)

likeSchema.index(
  { tweet: 1, likedBy: 1 },
  { unique: true, partialFilterExpression: { tweet: { $exists: true } } }
)

likeSchema.index(
  { comment: 1, likedBy: 1 },
  { unique: true, partialFilterExpression: { comment: { $exists: true } } }
)


likeSchema.pre("save",function(next){
    const isGiven = [this.tweet,this.video,this.comment]
    const One = isGiven.filter(Boolean).length
    if(One!= 1){
        next(new ApiError(400,"Only one reference is allowed"))
    }
})

export const Like = mongoose.model("Like",likeSchema)