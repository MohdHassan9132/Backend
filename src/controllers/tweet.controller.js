import {asyncHandler} from '../utils/async_handler.js'
import {ApiError} from '../utils/api_error.js'
import {ApiResponse} from '../utils/api_response.js'
import {uploadMedia,deleteMedia} from '../utils/cloudinary.js'
import {Tweet} from '../models/tweet.model.js'
import {Like} from '../models/likes.model.js'
import mongoose from 'mongoose'

const createTweet = asyncHandler(async (req, res) => {
    //check for file
    //check for content
    //upload if file
    //create the tweet doc in the db 
    //hide creadentials 
    //send the doc back to client
    //TODO: create tweet
    const userId = req.user._id
    const mediaFile = req.file
    const {content} = req.body
    let trimmedContent;
    if(content !== undefined && content !== null){
        if(typeof content === "string"){
            trimmedContent = content.trim()
            if(!trimmedContent){
                throw new ApiError(400,"Content cannot be empty")
            }
        }else{
            throw new ApiError(400,"Tweet Content must be string")
        }
    }else{
        throw new ApiError(400,"Tweet content is required")
    }
    if(trimmedContent.length > 500 ){
        throw new ApiError(400,"Content length is too long")
    }
    let media;
    let mediaType;
    try {
        if(mediaFile){
            mediaType = mediaFile.mimetype.startsWith("video") ? "video" : "image";
            media =  await uploadMedia(mediaFile,mediaType)
            if(!media){
                throw new ApiError(500,"Media upload failed")
            }
            mediaType = media.resource_type;
        }
        const tweetdoc = await Tweet.create({owner: userId,content: trimmedContent,media: media?.secure_url,mediaType,mediaPublicId: media?.public_id})
        const tweet = tweetdoc.toObject()
        delete tweet.mediaType
        delete tweet.mediaPublicId
        res.status(201)
        .json(new ApiResponse(201,tweet,"Tweet created successfully"))
    } catch (error) {
        if(media?.public_id && mediaType){
            await deleteMedia(media.public_id,mediaType)
        }
        throw error
    }
})

const getUserTweets = asyncHandler(async (req, res) => {

    const { page, limit, query, sortBy, sortType, userId } = req.query;

    // prepare variables
    const pageNo = Number(page);
    const limitNo = Number(limit);

    const variables = {
        page: Number.isFinite(pageNo) && pageNo >= 1 ? pageNo : 1,
        limit: Number.isFinite(limitNo) && limitNo >= 1 ? limitNo : 10,
        sortBy: typeof sortBy === "string" && sortBy.trim() ? sortBy : "createdAt",
        sortType: sortType === "desc" ? "desc" : "asc"
    };

    // userId only if valid
    if (mongoose.Types.ObjectId.isValid(userId)) {
        variables.userId = new mongoose.Types.ObjectId(userId);
    }

    // query only if valid
    if (typeof query === "string" && query.trim()) {
        variables.query = query.trim();
    }

    // -----------------------------
    // BUILD PIPELINE
    // -----------------------------

    const pipeline = [];

    // join owner data
    pipeline.push(
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        { $unwind: "$owner" }
    );

    pipeline.push(
        {
            $lookup:{
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "likedTweets"
            }

        }
    )

    pipeline.push(
        {
            $addFields:{
                likes: {$size: "$likedTweets"},
                isLiked:{$in:[req.user._id,"$likedTweets.likedBy"]}
            }
        }
    )

    // if specific userId → filter by user only
    if (variables.userId) {
        pipeline.push({
            $match: { "owner._id": variables.userId }
        });
    }

    // if no userId → allow global query search
    if (!variables.userId && variables.query) {
        pipeline.push({
            $match: {
                $or: [
                    { content: { $regex: variables.query, $options: "i" } },
                    { "owner.username": { $regex: variables.query, $options: "i" } }
                ]
            }
        });
    }

    // sorting
    pipeline.push({
        $sort: {
            [variables.sortBy]: variables.sortType === "asc" ? 1 : -1
        }
    });

    // pagination
    pipeline.push(
        { $skip: (variables.page - 1) * variables.limit },
        { $limit: variables.limit }
    );

    // select fields
    pipeline.push({
        $project: {
            _id: 1,
            content: 1,
            media: 1,
            createdAt: 1,
            owner: {
                _id: "$owner._id",
                username: "$owner.username",
                avatar: "$owner.avatar"
            },
            isLiked: 1,
            likes: 1
        }
    });


    // run aggregation
    const tweets = await Tweet.aggregate(pipeline);

    return res
        .status(200)
        .json(new ApiResponse(200, tweets, "Tweets fetched successfully"));
});

const getTweetById = asyncHandler(async(req,res)=>{
    const {tweetId} = req.params
    if(!mongoose.Types.ObjectId.isValid(tweetId)){
        throw new ApiError(400,"Invalid TweetId")
    }
    const tweet = await Tweet.aggregate(
        [
            {
                $match:{_id: new mongoose.Types.ObjectId(tweetId)}
            },
            {
                $lookup:{
                    from: "likes",
                    localField: "_id",
                    foreignField: "tweet",
                    as: "likedTweet"
                }
            },
            {
                $addFields:{
                    isLiked:{$in:[req.user._id,"$likedTweet"]}
                }
            },
            {
                $lookup:{
                    from:"users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "owner"
                }
            },
            {
                $unwind:"$owner"
            },
            {
                $project:{
                    owner: {
                        avatar: 1,
                        username: 1,
                    },
                    isLiked: 1,
                    content: 1,
                    media: 1,
                }
            }
        ]
    )
    if(tweet.length === 0){
        throw new ApiError(404,null,"No tweet found")
    }
    res.status(200)
    .json(new ApiResponse(200,tweet,"Tweet fetched successfully"))
})


const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    //get tweetId
    //check is the tweetId valid
    //if not error
    //get the tweet
    //if not error
    //get userId from middleware
    //if userId not equals tweet owner
    //unauthorized acces
    // check for the data 
    // is it undefined
    //is it string
    //is it empty
    //is it valid for length
    //then update the tweet 
    //send back as response
    const {content} = req.body
    if(content === null || content === undefined){
        throw new ApiError(400,"Content is required")
    }
    if(typeof content !== "string"){
        throw new ApiError(400,"Content must be string")
    }
    const newContent = content.trim()
    if(!newContent){
        throw new ApiError(400,"Content cannot be empty")
    }
    if(newContent.length > 500){
        throw new ApiError(400,"Content too long")
    }
    const {tweetId} = req.params

    if(!mongoose.Types.ObjectId.isValid(tweetId)){
        throw new ApiError(400,"Invalid tweetId")
    }
    const tweetDoc = await Tweet.findOneAndUpdate(
        {
            _id: tweetId,
            owner: req.user._id
        },
        {
            content: newContent 
        },
        {
            new: true,
            runValidators: true
        }
    )
    if(!tweetDoc){
        throw new ApiError(404,"Tweet not found")
    }

    const tweet = tweetDoc.toObject()
    delete tweet.mediaPublicId
    delete tweet.mediaType
    res.status(200)
    .json(new ApiResponse(200,tweet,"Tweet updated successfully"))

})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const userId = req.user._id
    const {tweetId} = req.params
    if(!tweetId){
        throw new ApiError(400,"TweetId is required")
    }
    if(!mongoose.Types.ObjectId.isValid(tweetId)){
        throw new ApiError(400,"Invalid tweetId")
    }
    let tweetDoc
    try {
        tweetDoc = await Tweet.findOneAndDelete(
            {
                _id:tweetId,
                owner: userId
            }
        )
        if(!tweetDoc){
            throw new ApiError(404,"Tweet not found")
        }
        if(tweetDoc){
            Like.deleteMany(
                {tweet: tweetDoc._id}
            )
        }
        if(tweetDoc?.mediaPublicId && tweetDoc?.mediaType){
            await deleteMedia(tweetDoc.mediaPublicId,tweetDoc.mediaType)
        }
        res.status(200)
        .json(new ApiResponse(200,null,"Tweet deleted successfully"))
    } catch (error) {
        if(tweetDoc?.mediaPublicId && tweetDoc?.mediaType){
            await deleteMedia(tweetDoc.mediaPublicId,tweetDoc.mediaType)
        }
        throw error
    }

})

export {
    createTweet,
    getUserTweets,
    getTweetById,
    updateTweet,
    deleteTweet
}