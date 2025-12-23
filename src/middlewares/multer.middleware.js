import multer from "multer";
import path from 'path'

const storage = multer.diskStorage({
    destination: function(req,file,cb){
        const folderPath = path.join(process.cwd(),"public","temp")
        cb(null,folderPath)
    },
    filename: function(req,file,cb){
        cb(null,file.originalname)
    }
})

export const upload = multer({storage: storage })
