import jwt from "jsonwebtoken"
import { ApiError } from "../utils/api_error.js"

const errorMiddleware = (err, req, res, next) => {
  // 1️⃣ Invalid JSON
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON payload"
    })
  }

  // 2️⃣ Custom API errors
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      statusCode: err.statusCode,
      message: err.message
    })
  }

  // 3️⃣ Errors that already have statusCode and message
  if (err.statusCode && err.message) {
    return res.status(err.statusCode).json({
      success: false,
      statusCode: err.statusCode,
      message: err.message
    })
  }

  // 4️⃣ JWT errors
 if (err instanceof jwt.TokenExpiredError) {
    return res.status(498).json({
      success: false,
      statusCode: 498,
      message: "Authentication required"
    })
  }

  if (err instanceof jwt.JsonWebTokenError) {
  return res.status(401).json({
    success: false,
    statusCode: 401,
    message: "Invalid or missing token"
  })
}
  // 5️⃣ Mongo duplicate key
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      statusCode: 409,
      message: "Resource already exists"
    })
  }

  if (err.name === "ValidationError") {
  return res.status(400).json({
    success: false,
    message: err.message
  })
}


  // 6️⃣ Fallback (all other unexpected errors)
  console.error(err)
  return res.status(500).json({
    success: false,
    statusCode: 500,
    message: "Internal Server Error"
  })
}





export { errorMiddleware }
