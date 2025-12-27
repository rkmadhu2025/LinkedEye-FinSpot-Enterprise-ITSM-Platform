/**
 * API Response Utility
 * Standardized response formatting for all API endpoints
 */

/**
 * Success response
 * @param {Object} res - Express response object
 * @param {any} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 */
const success = (res, data = null, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        timestamp: new Date().toISOString(),
    });
};

/**
 * Error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {any} errors - Validation errors or additional error info
 */
const error = (res, message = 'An error occurred', statusCode = 500, errors = null) => {
    const response = {
        success: false,
        message,
        timestamp: new Date().toISOString(),
    };

    if (errors) {
        response.errors = errors;
    }

    return res.status(statusCode).json(response);
};

/**
 * Paginated response
 * @param {Object} res - Express response object
 * @param {Array} data - Array of items
 * @param {Object} pagination - Pagination info
 * @param {string} message - Success message
 */
const paginated = (res, data, pagination, message = 'Success') => {
    return res.status(200).json({
        success: true,
        message,
        data,
        pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total: pagination.total,
            totalPages: Math.ceil(pagination.total / pagination.limit),
            hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
            hasPrev: pagination.page > 1,
        },
        timestamp: new Date().toISOString(),
    });
};

/**
 * Created response (201)
 * @param {Object} res - Express response object
 * @param {any} data - Created resource
 * @param {string} message - Success message
 */
const created = (res, data, message = 'Resource created successfully') => {
    return success(res, data, message, 201);
};

/**
 * No content response (204)
 * @param {Object} res - Express response object
 */
const noContent = (res) => {
    return res.status(204).send();
};

/**
 * Bad request response (400)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {any} errors - Validation errors
 */
const badRequest = (res, message = 'Bad request', errors = null) => {
    return error(res, message, 400, errors);
};

/**
 * Unauthorized response (401)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const unauthorized = (res, message = 'Unauthorized') => {
    return error(res, message, 401);
};

/**
 * Forbidden response (403)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const forbidden = (res, message = 'Forbidden') => {
    return error(res, message, 403);
};

/**
 * Not found response (404)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const notFound = (res, message = 'Resource not found') => {
    return error(res, message, 404);
};

/**
 * Conflict response (409)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const conflict = (res, message = 'Resource already exists') => {
    return error(res, message, 409);
};

/**
 * Validation error response (422)
 * @param {Object} res - Express response object
 * @param {any} errors - Validation errors
 */
const validationError = (res, errors) => {
    return error(res, 'Validation failed', 422, errors);
};

/**
 * Internal server error response (500)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
const serverError = (res, message = 'Internal server error') => {
    return error(res, message, 500);
};

module.exports = {
    success,
    error,
    paginated,
    created,
    noContent,
    badRequest,
    unauthorized,
    forbidden,
    notFound,
    conflict,
    validationError,
    serverError,
};
