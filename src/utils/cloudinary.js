import { v2 } from "cloudinary";
import fs from 'fs'

v2.config({
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME
})

const uploadMedia = async(ImagePath)=>{
    try {
        const response = await v2.uploader.upload(ImagePath,{resource_type: "auto"})
        fs.unlinkSync(ImagePath)
        return response
    } catch (error) {
        fs.unlinkSync(ImagePath)
        console.log(error?.message || error)
        throw error
    }
}

const deleteMedia = async(imageId,resource_type)=>{
        try {
            const response = await v2.uploader.destroy(imageId,{resource_type: resource_type})
            return response
        } catch (error) {
            console.log(error.message)
        }
}


export {uploadMedia,deleteMedia}