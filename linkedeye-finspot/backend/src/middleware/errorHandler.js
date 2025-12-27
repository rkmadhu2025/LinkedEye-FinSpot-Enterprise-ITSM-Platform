/**
 * Error Handler Middleware
 * Centralized error handling for the application
 */

const logger = require('../utils/logger');
const apiResponse = require('../utils/apiResponse');

/**
 * Custom Application Error
 */
class AppError extends Error {
    constructor(message, statusCode = 500, errors = null) {
        super(message);
        this.statusCode = statusCode;
        this.errors = errors;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Not Found Error (404)
 */
class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404);
    }
}

/**
 * Validation Error (422)
 */
class ValidationError extends AppError {
    constructor(errors, message = 'Validation failed') {
        super(message, 422, errors);
    }
}

/**
 * Unauthorized Error (401)
 */
class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, 401);
    }
}

/**
 * Forbidden Error (403)
 */
class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super(message, 403);
    }
}

/**
 * Conflict Error (409)
 */
class ConflictError extends AppError {
    constructor(message = 'Resource already exists') {
        super(message, 409);
    }
}

/**
 * Bad Request Error (400)
 */
class BadRequestError extends AppError {
    constructor(message = 'Bad request', errors = null) {
        super(message, 400, errors);
    }
}

/**
 * Handle async route errors
 * @param {Function} fn - Async route handler
 * @returns {Function} Express middleware
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * 404 Not Found middleware
 */
const notFoundHandler = (req, res, next) => {
    const error = new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`);
    next(error);
};

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
    // Log error
    const logData = {
        error: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        body: req.body,
        userId: req.user?.id,
        ip: req.ip,
    };

    // Determine if this is an operational error or programming error
    if (err.isOperational) {
        logger.warn('Operational error', logData);
    } else {
        logger.error('Programming error', logData);
    }

    // Handle specific error types
    let statusCode = err.statusCode || 500;
    let message = err.message;
    let errors = err.errors;

    // PostgreSQL errors
    if (err.code) {
        switch (err.code) {
            case '23505': // Unique violation
                statusCode = 409;
                message = 'Duplicate entry - this resource already exists';
                break;
            case '23503': // Foreign key violation
                statusCode = 400;
                message = 'Referenced resource does not exist';
                break;
            case '23502': // Not null violation
                statusCode = 400;
                message = 'Required field is missing';
                break;
            case '22P02': // Invalid text representation
                statusCode = 400;
                message = 'Invalid data format';
                break;
            case '42P01': // Undefined table
                statusCode = 500;
                message = 'Database error';
                logger.error('Undefined table', { code: err.code, detail: err.detail });
                break;
            default:
                if (err.code.startsWith('22') || err.code.startsWith('23')) {
                    statusCode = 400;
                    message = 'Invalid data';
                }
        }
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    }

    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    }

    // Multer file upload errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        statusCode = 400;
        message = 'File too large';
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        statusCode = 400;
        message = 'Unexpected file field';
    }

    // Syntax errors (malformed JSON)
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        statusCode = 400;
        message = 'Invalid JSON';
    }

    // Don't expose internal error details in production
    if (process.env.NODE_ENV === 'production' && statusCode === 500) {
        message = 'Internal server error';
        errors = null;
    }

    // Send response
    return apiResponse.error(res, message, statusCode, errors);
};

module.exports = {
    AppError,
    NotFoundError,
    ValidationError,
    UnauthorizedError,
    ForbiddenError,
    ConflictError,
    BadRequestError,
    asyncHandler,
    notFoundHandler,
    errorHandler,
};
