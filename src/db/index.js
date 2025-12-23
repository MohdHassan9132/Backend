import mongoose from "mongoose";

const dbConnection = async()=>{
    try {
        const dbConnectionInstance = await mongoose.connect(`${process.env.DB_URL}/${process.env.DB_NAME}`)
        console.log(dbConnectionInstance.connection.name)
    } catch (error) {
        console.log(error.message || error)
    }
}

export {dbConnection}