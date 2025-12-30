import { Router } from "express";
import { addComment, deleteComment, getVideoComments, updateComment } from '../controllers/comment.controller.js'
import {verifyJWT} from '../middlewares/auth.middleware.js'

const commentRouter = Router()
commentRouter.route("/getVideoComments").get(verifyJWT,getVideoComments)
commentRouter.route("/addcomment/:videoId").post(verifyJWT,addComment)
commentRouter.route("/updateComment/:videoId/:commentId").patch(verifyJWT,updateComment)
commentRouter.route("/deleteComment/:videoId/:commentId").delete(verifyJWT,deleteComment)

export{commentRouter}