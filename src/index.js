import { dbConnection } from "./db/index.js";
import { app } from "./app.js";
dbConnection().then(()=>{
    app.on("error",()=>{
        console.log("Error from app")
    })
    app.listen(process.env.PORT||3000,()=>{
        console.log(`app is listening on port ${process.env.PORT}`)
    })
})
.catch((error)=>{
    console.log(error.message)
})