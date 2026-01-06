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
            media =  await uploadMedia(mediaFile)
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
    //check for required fields
    //limit,page,sorTby,sortType(REQUIRED)
    //then  query and userId (OPTIONAL)
    //use an object approach where 
    //add all necessary ones even if not given
    //and leave if the optional not found
    //but during pipeline always 
    //first query,userid
    //second sortBy,sortType,
    //lookups if required
    //then pagination
    // TODO: get user tweets
    const {page,limit,query,sortBy,sortType,userId} = req.query
    const pageNo = Number(page)
    const limitNo = Number(limit)
    const variables = {}
    variables.page = Number.isFinite(pageNo) && pageNo >= 1 ? pageNo : 1;
    variables.limit = Number.isFinite(limitNo) && limitNo >= 1 ? limitNo : 10;
    variables.sortBy = typeof sortBy === "string" && sortBy.trim() ? sortBy : "createdAt"
    variables.sortType = (typeof sortType === "string" &&(sortType === "asc" || sortType === "desc"))  ? sortType : "asc"
    if(mongoose.Types.ObjectId.isValid(userId)){
        variables.userId = new mongoose.Types.ObjectId(userId)
    }
    if(typeof query === "string"){
        const trimmedquery = query.trim()
        if(trimmedquery){
            variables.query = trimmedquery
        }
        
    }
    //mandatory
        //in pipeline 
        //first query
        //then sort
        //then pagination
    //algoritham
        //lookup for user
        //match query 
        //sort
        //paginate
    const pipeline = []
        pipeline.push({
            $lookup:{
                from: "users",
                foreignField: "_id",
                localField: "owner",
                as: "owner"
            }
        },
        {
            $unwind: "$owner"
        }   
    )
    if(variables.userId){
        pipeline.push({
            $match:{
                owner: variables.userId
            }
        });
    if(variables.query){
        pipeline.push({
            $match: {
                content: { $regex: variables.query, $options: "i" }
            }
        });
    }
    }else if(variables.query){
        pipeline.push({
            $match: {
                $or:[
                    {content: {$regex: variables.query,$options: 'i'}},
                    {"owner.username":{$regex:variables.query,$options: 'i'}}
                ]
            }
        })
    }

    pipeline.push({
        $sort:{
            [variables.sortBy]: variables.sortType === "asc" ? 1:-1 
        }
    })
    pipeline.push(
        {$skip:(variables.page-1)*variables.limit},
        {$limit:variables.limit}
        
    )
    pipeline.push({
        $project:{
            _id: 1,
            content: 1,
            media: 1,
            owner:{
                _id: "$owner._id",
                username: "$owner.username",
                avatar: "$owner.avatar",
            }
        }
    })
    const tweets = await Tweet.aggregate(pipeline)
    
    res.status(200)
    .json(new ApiResponse(200,tweets,"Tweets fetched successfully"))
    
    
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
    updateTweet,
    deleteTweet
}