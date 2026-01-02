import { Router } from "express";
import {verifyJWT} from '../middlewares/auth.middleware.js'
import { addVideoToPlaylist, createPlaylist, deletePlaylist, getPlaylistById, getUserPlaylists, removeVideoFromPlaylist, updatePlaylist } from "../controllers/playlist.controller.js";
import {upload} from '../middlewares/multer.middleware.js'

const playlistRouter = Router()

playlistRouter.route("/createPlaylist").post(verifyJWT,upload.single('playlistCover'),createPlaylist)

playlistRouter.route("/getUserPlaylists/:userId").get(verifyJWT,getUserPlaylists)

playlistRouter.route("/getPlaylistById/:playlistId").get(verifyJWT,getPlaylistById)

playlistRouter.route("/addVideoToPlaylist/:videoId/:playlistId").patch(verifyJWT,addVideoToPlaylist)

playlistRouter.route("/removeVideoFromPlaylist/:videoId/:playlistId").patch(verifyJWT,removeVideoFromPlaylist)

playlistRouter.route("/deletePlaylist/:playlistId").delete(verifyJWT,deletePlaylist)

playlistRouter.route("/updatePlaylist/:playlistId").patch(verifyJWT,upload.single("playlistCover"),updatePlaylist)

export{playlistRouter}