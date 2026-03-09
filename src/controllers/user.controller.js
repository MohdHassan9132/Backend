import { asyncHandler } from "../utils/async_handler.js";
import { ApiResponse } from "../utils/api_response.js";
import { ApiError } from "../utils/api_error.js";
import { uploadMedia, deleteMedia } from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { google} from "googleapis";
import crypto from "crypto";
import { cookieOptions } from "../config/cookie.js";
import { ENV } from "../config/env.js";
import { APIS } from "googleapis/build/src/apis/index.js";

const refreshAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken: accessToken, refreshToken: refreshToken };
  } catch (error) {
    throw new ApiError(500, "Error while generating tokens");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  //take value from fields
  //validate the fields
  //check if the user exists
  //check for avatar and coverImage
  //upload on cloudinary avatar and coverImage
  //create the user in the db
  //return the response without sensitive fields
  const { username, email, fullName, password } = req.body;
  if ([username, email, password].some((fields) => !fields || !fields.trim())) {
    throw new ApiError(400, "All fields are required");
  }

  const isUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (isUser) {
    throw new ApiError(409, "User already exists");
  }

  const avatar = req?.files?.avatar;

  let avatarImage, uploadedCoverImage;
  try {
    if (avatar && avatar.length >= 1) {
      avatarImage = await uploadMedia(avatar[0], "image");
    }
    const coverImage = req?.files?.coverImage;
    if (coverImage && coverImage.length >= 1) {
      uploadedCoverImage = await uploadMedia(coverImage[0], "image");
    }

    const user = await User.create({
      username,
      email,
      fullName,
      password,
      coverImage: uploadedCoverImage?.secure_url,
      coverImagePublicId: uploadedCoverImage?.public_id,
      avatar: avatarImage?.secure_url,
      avatarPublicId: avatarImage?.public_id,
    });

    const userData = user.toObject();
    delete userData.coverImagePublicId;
    delete userData.avatarPublicId;
    delete userData.password;
    delete userData.watchHistory;

    res
      .status(201)
      .json(new ApiResponse(201, userData, "User registered successfully"));
  } catch (error) {
    if (uploadedCoverImage?.public_id) {
      await deleteMedia(uploadedCoverImage.public_id, "image");
    }
    if (avatarImage?.public_id) {
      await deleteMedia(avatarImage.public_id, "image");
    }
    throw error;
  }
});

const loginUser = asyncHandler(async (req, res) => {
  //get username or email and password
  //check for the fields
  //get the user
  //compare password
  //generate the tokens
  //set the tokens as cookie
  //save the refresh in the doc
  //return the response

  const username = req.body.username;
  const password = req.body.password;
  const email = req.body.email;
  if (!username && !email) {
    throw new ApiError(400, "username is required");
  }
  let trimmedUsername;
  if (username !== undefined && username !== null) {
    if (typeof username === "string") {
      trimmedUsername = username.trim().toLowerCase();
    } else {
      throw new ApiError(400, "username must be string");
    }
    if (!trimmedUsername) {
      throw new ApiError(400, "Username cannot be empty");
    }
  }

  let trimmedPassword;
  if (!password) {
    throw new ApiError(400, "password is required");
  }
  if (typeof password === "string") {
    trimmedPassword = password.trim();
    if (!trimmedPassword) {
      throw new ApiError(400, "Password cannot be empty");
    }
  } else {
    throw new ApiError(400, "Password must be string");
  }

  const userData = await User.findOne({ username: trimmedUsername });

  if (!userData) {
    throw new ApiError(404, "No User found");
  }

  if(userData.googleId){
    throw new ApiError(400,"User registered with google, please login with google")
  }
  

  const isCorrect = await userData.isPasswordCorrect(trimmedPassword);

  if (!isCorrect) {
    throw new ApiError(401, "Invalid Credentials");
  }

  const { refreshToken, accessToken } = await refreshAccessAndRefreshToken(
    userData._id
  );

  const user = userData.toObject();
  delete user.avatarPublicId;
  delete user.coverImagePublicId;
  delete user.password;
  delete user.refreshToken;
  delete user.watchHistory;

  res
    .status(200)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .cookie("accessToken", accessToken, cookieOptions)
    .json(new ApiResponse(200, user, "User logged in successfully"));
});

const logoutUser = asyncHandler(async (req, res) => {
  //get the user
  //clear the cookie
  //clear the refreshToken in db
  //return the response
  const user = req.user;
  user.refreshToken = "";
  await user.save({ validateBeforeSave: false });
  res
    .status(200)
    .clearCookie("refreshToken", cookieOptions)
    .clearCookie("accessToken", cookieOptions)
    .json(new ApiResponse(200, null, "User logged out successfully"));
});

// const googleAuth = asyncHandler(async (req, res) => {
//   /**
//    * To use OAuth2 authentication, we need access to a CLIENT_ID, CLIENT_SECRET, AND REDIRECT_URI
//    * from the client_secret.json file. To get these credentials for your application, visit
//    * https://console.cloud.google.com/apis/credentials.
//    */
//   let oauth2Client = new google.auth.OAuth2(
//     ENV.GOOGLE.CLIENT_ID,
//     ENV.GOOGLE.CLIENT_SECRET,
//     ENV.GOOGLE.REDIRECT_URL
//   );
//   if (!req?.query?.code && !req?.query?.error) {
//     // Updated scopes for login/identity only
//     const scopes = [
//       "https://www.googleapis.com/auth/userinfo.profile",
//       "https://www.googleapis.com/auth/userinfo.email",
//     ];

//     // Generate a secure random state value.
//     const state = crypto.randomBytes(32).toString("hex");

//     // Store state in the session
//     console.log(req.session);
//     req.session.state = state;

//     // Generate a url that asks permissions for the Drive activity and Google Calendar scope
//     const authorizationUrl = oauth2Client.generateAuthUrl({
//       // 'online' (default) or 'offline' (gets refresh_token)
//       access_type: "offline",
//       /** Pass in the scopes array defined above.
//        * Alternatively, if only one scope is needed, you can pass a scope URL as a string */
//       scope: scopes,
//       // Enable incremental authorization. Recommended as a best practice.
//       include_granted_scopes: true,
//       // Include the state parameter to reduce the risk of CSRF attacks.
//       state: state,
//     });
//     try {
//       res.redirect(authorizationUrl);
//     } catch (error) {
//       console.log(error);
//     }
//   } else {
//     const codeFromGoogle = req?.query;
//     /*
//             {
//             state: 'a state is sent when asking from user for access using middleware express-session if it is not same to the sended one , a security attack',
//             iss: 'https://accounts.google.com',
//             code: 'code through which google access and refreshToken with generated using funcion .getToken of Oauth ,
//             scope: 'Whatever request from the api like email password drive ',
//             authuser: '0',
//             prompt: 'consent access_denied if user restricts'
//             }
//             */
//     console.log("Secret code from google",codeFromGoogle);
//     if (codeFromGoogle.error) {
//       console.log("User did not gave the permision");
//       throw new ApiError(400, "Permission denied");
//     }
//     // else if(req.session.state !== codeFromGoogle.state ){
//     //     console.error("Possible CSRF attack")
//     //     throw new ApiError(500,"Something went wrong");
//     // }
//     else {
//       const { tokens } = await oauth2Client.getToken(codeFromGoogle.code);
//         console.log(tokens)
//       console.log("Main token object",tokens);
//       const googleAccessToken = tokens.access_token;
//       const googleRefreshToken = tokens.refresh_token;
//       oauth2Client.setCredentials(tokens);
//       //   console.log("This is access token details", googleAccessToken);
//       //   console.log("This is refreshToken", googleRefreshToken);
//       //passing the client and user token to get profile data
//       const tokenIdData = await oauth2Client.verifyIdToken({
//         idToken: tokens.id_token,
//         audience: ENV.GOOGLE.CLIENT_ID
//       });
//       console.log(tokenIdData)
//       const oauth2 = google.oauth2({
//         auth: oauth2Client,
//         version: "v2",
//       });

//       const userDetails = await oauth2.userinfo.get();
//       //main details are .data
//         console.log("User details object",userDetails.data);
//       const user = await User.create({
//         username: userDetails.data.name,
//         email: userDetails.data.email,
//         avatar: userDetails.data.picture,
//         googleRefreshToken: tokens.refresh_token,
//       });
//       const userData = user.toObject();
//       delete userData.googleRefreshToken;

//       if (!user) {
//         console.log("User creation in db failed");
//         throw new ApiError(500, "Internal Server Error");
//       }
//       const { accessToken, refreshToken } = await refreshAccessAndRefreshToken(
//         user._id
//       );
//       res
//         .status(201)
//         .cookie("refreshToken", refreshToken)
//         .cookie("accessToken", accessToken)
//         .json(new ApiResponse(201, userData, "User created successfully"));
//         // 107953989691548285480
//     }
//   }
// });

const googleAuth = asyncHandler(async(req,res)=>{
    // console.log(req.query)
    console.log("User is using google for login")
    let googleClient = new google.auth.OAuth2({
        client_id: ENV.GOOGLE.CLIENT_ID,
        client_secret: ENV.GOOGLE.CLIENT_SECRET,
        redirectUri: ENV.GOOGLE.REDIRECT_URL
    })
    if(!req.query?.error && !req.query?.code){
      console.log("generating redirect url")
        const redirectUrl = googleClient.generateAuthUrl({
            scope:[
                "https://www.googleapis.com/auth/userinfo.profile",
                "https://www.googleapis.com/auth/userinfo.email",
            ],
            access_type: "offline"
        })
        console.log("Authorization url generated",)
        res.redirect(redirectUrl)
    }else{
        // console.log(req.query)
        console.log("got the code from google",req.query?.code)
        const {tokens} = await googleClient.getToken(req.query?.code)
        // console.log(tokens)
        console.log("got the tokens from google",tokens.scope)
        googleClient.setCredentials(tokens)
        const tokenData = await googleClient.verifyIdToken({
            idToken: tokens.id_token,
            audience: googleClient._clientId,
        })
        const userData = tokenData.payload
        console.log("got user details from id_token",userData)
        // console.log(userData)
        //instead of findOne can also use exist and take the whole user doc from refreshAccessAndRefreshToken
        console.log("checking does the user exists")
        const isUser = await User.findOne({googleId: userData.sub})
        if(isUser){
          console.log("user exists generating tokens")
            const {refreshToken,accessToken} = await refreshAccessAndRefreshToken(isUser._id)
            console.log("tokens generated redirecting to frontend")
            res.status(200)
            .cookie("refreshToken",refreshToken,cookieOptions)
            .cookie("accessToken",accessToken,cookieOptions)
            res.redirect(`${ENV.FRONTEND_URL}`)
        }else{
          console.log("creating the user")
            const user = await User.create({
                username: userData.name,
                avatar: userData.picture,
                googleId: userData.sub,
                email: userData.email,
                googleRefreshToken: tokens.refresh_token
            })
            console.log("user created")
            if(!user){
                console.error("Error while creating user in the db")
                throw new ApiError(500,"Something went wrong")
            }
            console.log("generating tokens")
            const {refreshToken,accessToken} = await refreshAccessAndRefreshToken(user._id)
            console.log("tokens generated redirecting to frontend")
            res.status(201)
            .cookie("refreshToken",refreshToken,cookieOptions)
            .cookie("accessToken",accessToken,cookieOptions)
            res.redirect(`${ENV.FRONTEND_URL}`)
        }
    }
})

const getUser = asyncHandler(async (req, res) => {
  //verify the user get the user object and pass it into the response
  const userData = req.user;
  const user = userData.toObject();
  delete user.avatarPublicId;
  delete user.coverImagePublicId;
  delete user.refreshToken;
  delete user.password;
  res.status(200).json(new ApiResponse(200, user, "User fetched successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  //check for refreshToken
  //generate both token and return the response
  const token = req.cookies.refreshToken;
  if (!token) {
    throw new ApiError(401, "Unauthorized Access");
  }
  const tokenData = jwt.verify(token, ENV.TOKENS.REFRESH_SECRET);
  const user = await User.findById(tokenData._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  if (user.refreshToken !== token) {
    throw new ApiError(401, "token mismatch");
  }
  const { refreshToken, accessToken } = await refreshAccessAndRefreshToken(
    tokenData._id
  );
  res
    .status(200)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .cookie("accessToken", accessToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        { refreshToken, accessToken },
        "Access token refresh successfully"
      )
    );
});

const updateUserDetails = asyncHandler(async (req, res) => {
  //check for the fields
  //check if the user exists
  //check if their is another user with that fields
  //update the user fields
  //return the response
  const userData = req.user;
  const { username, fullName } = req.body;
  if (!username && !fullName) {
    throw new ApiError(400, "At least one field is required");
  }
  const updateDetails = {};
  let trimmedfullName, trimmedUsername;
  if (username !== undefined && username != null) {
    if (typeof username === "string") {
      trimmedUsername = username.trim().toLowerCase();
    } else {
      throw new ApiError(400, "Username must be string");
    }
    if (!trimmedUsername) {
      throw new ApiError(400, "Username cannot be empty");
    } else {
      updateDetails.username = trimmedUsername;
    }
  }
  if (fullName !== undefined && fullName !== null) {
    if (typeof fullName === "string") {
      trimmedfullName = fullName.trim().toLowerCase();
    } else {
      throw new ApiError(400, "fullName must be string");
    }
    if (!trimmedfullName) {
      throw new ApiError(400, "fullName cannot be empty");
    } else {
      updateDetails.fullName = fullName;
    }
  }
  if (Object.keys(updateDetails).length === 0) {
    throw new ApiError(400, "No valid field to updated");
  }
  const updatedUser = await User.findByIdAndUpdate(
    userData._id,
    updateDetails,
    { new: true }
  );
  if (!updatedUser) {
    throw new ApiError(404, "user not found");
  }
  const user = updatedUser.toObject();
  delete user.password;
  delete user.refreshToken;
  delete user.avatarPublicId;
  delete user.coverImagePublicId;
  delete user.watchHistory;
  res.status(200).json(new ApiResponse(200, user, "User updated successfully"));
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  //get the current and new password
  //check if the current is same in db
  //add the new password to db
  const userData = req.user;
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    throw new ApiError(400, "All fields are required");
  }
  let currentTrimmedPassword, newTrimmedPassowrd;
  if (typeof currentPassword === "string" && typeof newPassword === "string") {
    currentTrimmedPassword = currentPassword.trim();
    newTrimmedPassowrd = newPassword.trim();
    if (!newTrimmedPassowrd || !currentTrimmedPassword) {
      throw new ApiError(400, "Passwords cannot be empty");
    }
  } else {
    throw new ApiError(400, "Current password and new passowrd must be string");
  }
  if (currentTrimmedPassword === newTrimmedPassowrd) {
    throw new ApiError(400, "New password must be different from previous");
  }
  const isCorrect = await userData.isPasswordCorrect(currentTrimmedPassword);
  if (!isCorrect) {
    throw new ApiError(403, "Passowrd is incorrect");
  }
  userData.password = newTrimmedPassowrd;
  await userData.save();
  res
    .status(200)
    .json(new ApiResponse(200, null, "User password updated successfully"));
});

const UpdateUserAvatar = asyncHandler(async (req, res) => {
  const userData = req.user;
  const avatar = req?.file;
  if (!avatar) {
    throw new ApiError(400, "Avatar is required");
  }
  let newAvatar;
  try {
    newAvatar = await uploadMedia(avatar, "image");
    const oldAvatar = userData.avatarPublicId;
    userData.avatarPublicId = newAvatar.public_id;
    userData.avatar = newAvatar.secure_url;
    await userData.save();
    if (oldAvatar) {
      await deleteMedia(oldAvatar, "image");
    }
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          newAvatar.secure_url,
          "Avatar updated successfully"
        )
      );
  } catch (error) {
    if (newAvatar?.public_id) {
      await deleteMedia(newAvatar.public_id, "image");
    }
    throw error;
  }
});

const updatUserCoverImage = asyncHandler(async (req, res) => {
  const userData = req.user;
  const coverImage = req?.file;
  if (!coverImage) {
    throw new ApiError(400, "coverImage is required");
  }
  let newCoverImage;
  try {
    newCoverImage = await uploadMedia(coverImage, "image");
    const oldCoverImage = userData.coverImagePublicId;
    userData.coverImagePublicId = newCoverImage.public_id;
    userData.coverImage = newCoverImage.secure_url;
    await userData.save();
    if (oldCoverImage) {
      await deleteMedia(oldCoverImage, "image");
    }
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          newCoverImage.secure_url,
          "CoverImage updated successfully"
        )
      );
  } catch (error) {
    if (newCoverImage?.public_id) {
      await deleteMedia(newCoverImage.public_id, "image");
    }
    throw error;
  }
  res.status(200).json(new ApiResponse(200, coverImage, "Coverimage recieved"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  if (!req.params.username) {
    throw new ApiError(400, "username is required");
  }
  const { username } = req.params;
  let trimmedUsername;
  if (typeof username === "string") {
    trimmedUsername = username.trim().toLowerCase();
    if (!trimmedUsername) {
      throw new ApiError(400, "username cannot be empty");
    }
  } else {
    throw new ApiError(400, "username must be string");
  }
  const channel = await User.aggregate([
    {
      $match: { username: trimmedUsername },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribersCount",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedToCount",
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "_id",
        foreignField: "owner",
        as: "userVideos",
      },
    },
    {
      $addFields: {
        Videos: { $size: "$userVideos" },
        subscribers: { $size: "$subscribersCount" },
        subscribedTo: { $size: "$subscribedToCount" },
        isSubscribed: {
          $cond: {
            if: { $in: [userId, "$subscribersCount.subscriber"] },
            then: 1,
            else: 0,
          },
        },
      },
    },
    {
      $project: {
        username: 1,
        avatar: 1,
        coverImage: 1,
        subscribers: 1,
        subscribedTo: 1,
        isSubscribed: 1,
        Videos: 1,
      },
    },
  ]);
  if (channel.length === 0) {
    throw new ApiError(404, "No channel found");
  }
  res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully")
    );
});

const getUserWatchHistory = asyncHandler(async (req, res) => {
  const userWatchHistory = await User.aggregate([
    {
      $match: { _id: new mongoose.Types.ObjectId(req.user._id) },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $unwind: {
              path: "$owner",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              videoFile: 1,
              thumbnail: 1,
              createdAt: 1,
              description: 1,
              title: 1,
              duration: 1,
              isPublished: 1,
              views: 1,
              owner: 1,
            },
          },
        ],
      },
    },
    {
      $project: {
        watchHistory: 1,
      },
    },
  ]);
  if (userWatchHistory.length === 0) {
    throw new ApiError(404, "No user watch History found");
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        userWatchHistory[0],
        "User watch history fetched successfully"
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  getUser,
  refreshAccessToken,
  updateUserDetails,
  changeCurrentPassword,
  UpdateUserAvatar,
  updatUserCoverImage,
  getUserChannelProfile,
  getUserWatchHistory,
  googleAuth,
};
