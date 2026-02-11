import mongoose , {Schema} from "mongoose";
import { ApiError } from "../utils/api_error.js";

const commentSchema = new Schema({
    content: {
        type: String,
        required: true
    },
    video:{
        type:Schema.Types.ObjectId,
        ref: "Video"
    },
    tweet:{
        type: Schema.Types.ObjectId,
        ref:"Tweet"
    },
    owner:{
        type: Schema.Types.ObjectId,
        ref: "User"
    }
},{timestamps: true})

commentSchema.index(
    {video:1,owner:1},
    {unique:true,partialFilterExpression:{video:{$exists:true}}}
)
commentSchema.pre("save",function(next){
    const isGiven = [this.tweet,this.video]
    const one = isGiven.filter(Boolean).length
    if(one!=1){
        next(new ApiError(400,"Only one refrence is allowed"))
    }
})

export const Comment = mongoose.model("Comment",commentSchema)