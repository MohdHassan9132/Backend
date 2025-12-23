import { v2 } from "cloudinary";
import fs from 'fs'

v2.config({
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME
})

const uploadImage = async(ImagePath)=>{
    try {
        const response = await v2.uploader.upload(ImagePath)
        fs.unlinkSync(ImagePath)
        return response
    } catch (error) {
        fs.unlinkSync(ImagePath)
        console.log(error?.message || error)
    }
}

const deleteImage = async(imageId)=>{
    try {
        const response = await v2.uploader.destroy(imageId)
        return response
    } catch (error) {
        console.log(error)
    }
}

const uploadVideo = async(videoPath)=>{
try {
        const response = await v2.uploader.upload(videoPath,{
            resource_type: "video"
        })
        fs.unlinkSync(videoPath)
        console.log(response)
       return response
} catch (error) {
    fs.unlinkSync(videoPath)
    console.log(error?.message||error)
}
}

const deleteVideo = async(videoId)=>{
    try {
        const response = await v2.uploader.destroy(videoId,{
            resource_type: "video"
        })
        return response
    } catch (error) {
        console.log(error.message||error)
    }
}

export {uploadImage,deleteImage,uploadVideo,deleteVideo}