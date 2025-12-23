import { ApiError } from "../utils/api_error.js"

const errorMiddleware = (err, req, res, next) => {
    let statusCode = err.statusCode || 500
    let message = err.message || "Internal Server Error"

    // MongoDB duplicate key error
    if (err.code === 11000) {
        statusCode = 409
        message = "Resource already exists"
    }

    // Mongoose invalid ObjectId
    if (err.name === "CastError") {
        statusCode = 400
        message = "Invalid ID format"
    }

    // JWT errors
    if (err.name === "JsonWebTokenError") {
        statusCode = 401
        message = "Invalid token"
    }

    if (err.name === "TokenExpiredError") {
        statusCode = 401
        message = "Token expired"
    }

    res.status(statusCode).json({
        success: false,
        statusCode,
        message
    })
}

export { errorMiddleware }
