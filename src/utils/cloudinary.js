import { v2 } from "cloudinary";
import fs from 'fs'
import { ApiError } from "./api_error.js";

v2.config({
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME
})

const MAX_IMAGE_SIZE = 10*1024*1024
const MAX_VIDEO_SIZE = 100*1024*1024

const uploadMedia = async(media)=>{
    try {
        if(media.mimetype.startsWith("image")){
            if(media.size < MAX_IMAGE_SIZE){
                   const response = await v2.uploader.upload(media.path,{resource_type: "image"})
                   return response
            }else{
                throw new ApiError(400,"Image must be less than 10mb")
            }
        }
        if(media.mimetype.startsWith("video")){
            if(media.size < MAX_VIDEO_SIZE){
                const response = await v2.uploader.upload(media.path,{resource_type: "video"})
                return response
            }else{
                throw new ApiError(400,"Video must be less than 100mb")
            }
        }
    } catch (error) {
          if (error instanceof ApiError) {
            throw error
        }
        console.log(error.message || error)
        throw new ApiError(503, "Media service unavailable")
    }finally{
        if(fs.existsSync(media.path)){
            fs.unlinkSync(media.path)
        }
    }
}

const deleteMedia = async(mediaId,resource_type)=>{
        try {
            const response = await v2.uploader.destroy(mediaId,{resource_type: resource_type})
            return response
        } catch (error) {
            console.log(error.message)
        }
}


export {uploadMedia,deleteMedia}