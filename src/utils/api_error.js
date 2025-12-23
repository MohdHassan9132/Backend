class ApiError extends Error{
    constructor(statusCode,message = "something went wrong", error = [], stack){
        super(message)
        this.statusCode = statusCode
        this.error = error
        if(!stack){
            this.stack = Error.captureStackTrace(this,this.constructor)
        }
        this.stack = stack
        this.success = false
    }
}

export {ApiError}