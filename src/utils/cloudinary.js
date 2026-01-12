import { v2 } from "cloudinary";
import fs from "fs";
import { ApiError } from "./api_error.js";

v2.config({
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
});

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;

const uploadMedia = async (media, expectedType) => {
  try {
    if (!media) {
      throw new ApiError(400, "No media file provided");
    }

    if (!media.mimetype.startsWith(expectedType)) {
      throw new ApiError(400, `Uploaded file must be a valid ${expectedType}`);
    }

    if (expectedType === "image" && media.size > MAX_IMAGE_SIZE) {
      throw new ApiError(400, "Image must be less than 10MB");
    }

    if (expectedType === "video" && media.size > MAX_VIDEO_SIZE) {
      throw new ApiError(400, "Video must be less than 100MB");
    }
    const result = await v2.uploader.upload(media.path, {
      resource_type: expectedType,
    });

    return result;
  } catch (err) {
    if (err instanceof ApiError) throw err;

    console.log(err);
    throw new ApiError(503, "Media service unavailable");
  } finally {
    if (fs.existsSync(media.path)) {
      fs.unlinkSync(media.path);
    }
  }
};

const deleteMedia = async (mediaId, expectedType) => {
  try {
    return await v2.uploader.destroy(mediaId, {
      resource_type: expectedType,
    });
  } catch (err) {
    console.log(err);
  }
};

export { uploadMedia, deleteMedia };
