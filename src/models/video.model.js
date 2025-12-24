import mongoose, {Schema, SchemaType} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema({
    videoFile:{
        type: String,
        requried: true
    },
    videoPublicId:{
        type: String,
        requried: true
    },
    thumbnail:{
        type: String,
        required: true
    },
    thumbnailPublicId:{
        type: String,
        required: true
    },
    title:{
        type: String,
        required: true
    },
    description:{
        type: String
    },
    owner:{
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    duration:{
        type: Number,
        required: true
    },
    views:{
        type: Number
    },
    isPublished:{
        type: Boolean,
        default: true
    }
},{timestamps: true})

videoSchema.plugin(mongooseAggregatePaginate)


export const Video = mongoose.model("Video",videoSchema)