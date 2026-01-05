import mongoose , {Schema} from "mongoose";

const commentSchema = new Schema({
    content: {
        type: String,
        required: true
    },
    video:{
        type:Schema.Types.ObjectId,
        ref: "Video"
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

export const Comment = mongoose.model("Comment",commentSchema)