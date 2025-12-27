/**
 * Validation Middleware
 * Request validation using express-validator
 */

const { validationResult, body, param, query } = require('express-validator');
const apiResponse = require('../utils/apiResponse');

/**
 * Process validation errors
 */
const validate = (validations) => {
    return async (req, res, next) => {
        // Run all validations
        await Promise.all(validations.map((validation) => validation.run(req)));

        const errors = validationResult(req);

        if (errors.isEmpty()) {
            return next();
        }

        // Format errors
        const formattedErrors = errors.array().map((error) => ({
            field: error.path,
            message: error.msg,
            value: error.value,
        }));

        return apiResponse.validationError(res, formattedErrors);
    };
};

/**
 * Common validation rules
 */
const rules = {
    // UUID validation
    uuid: (field, location = 'param') => {
        const validator = location === 'param' ? param(field) : location === 'body' ? body(field) : query(field);
        return validator
            .trim()
            .notEmpty()
            .withMessage(`${field} is required`)
            .isUUID(4)
            .withMessage(`${field} must be a valid UUID`);
    },

    // Optional UUID
    uuidOptional: (field, location = 'body') => {
        const validator = location === 'param' ? param(field) : location === 'body' ? body(field) : query(field);
        return validator
            .optional({ nullable: true })
            .isUUID(4)
            .withMessage(`${field} must be a valid UUID`);
    },

    // Email validation
    email: (field = 'email') =>
        body(field)
            .trim()
            .notEmpty()
            .withMessage('Email is required')
            .isEmail()
            .withMessage('Invalid email format')
            .normalizeEmail()
            .isLength({ max: 255 })
            .withMessage('Email must be less than 255 characters'),

    // Password validation
    password: (field = 'password') =>
        body(field)
            .notEmpty()
            .withMessage('Password is required')
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters')
            .matches(/[a-z]/)
            .withMessage('Password must contain at least one lowercase letter')
            .matches(/[A-Z]/)
            .withMessage('Password must contain at least one uppercase letter')
            .matches(/[0-9]/)
            .withMessage('Password must contain at least one number')
            .matches(/[!@#$%^&*(),.?":{}|<>]/)
            .withMessage('Password must contain at least one special character'),

    // String validation
    string: (field, options = {}) => {
        const { min = 1, max = 255, required = true, location = 'body' } = options;
        const validator = location === 'body' ? body(field) : query(field);

        let chain = validator.trim();

        if (required) {
            chain = chain.notEmpty().withMessage(`${field} is required`);
        } else {
            chain = chain.optional({ nullable: true });
        }

        if (min > 0) {
            chain = chain.isLength({ min }).withMessage(`${field} must be at least ${min} characters`);
        }

        if (max) {
            chain = chain.isLength({ max }).withMessage(`${field} must be less than ${max} characters`);
        }

        return chain;
    },

    // Text (long string) validation
    text: (field, options = {}) => {
        const { required = false, max = 10000, location = 'body' } = options;
        const validator = location === 'body' ? body(field) : query(field);

        let chain = validator.trim();

        if (required) {
            chain = chain.notEmpty().withMessage(`${field} is required`);
        } else {
            chain = chain.optional({ nullable: true });
        }

        return chain.isLength({ max }).withMessage(`${field} must be less than ${max} characters`);
    },

    // Integer validation
    integer: (field, options = {}) => {
        const { min, max, required = false, location = 'body' } = options;
        const validator = location === 'body' ? body(field) : query(field);

        let chain = validator;

        if (required) {
            chain = chain.notEmpty().withMessage(`${field} is required`);
        } else {
            chain = chain.optional({ nullable: true });
        }

        chain = chain.isInt().withMessage(`${field} must be an integer`);

        if (min !== undefined) {
            chain = chain.isInt({ min }).withMessage(`${field} must be at least ${min}`);
        }

        if (max !== undefined) {
            chain = chain.isInt({ max }).withMessage(`${field} must be at most ${max}`);
        }

        return chain.toInt();
    },

    // Boolean validation
    boolean: (field, options = {}) => {
        const { required = false, location = 'body' } = options;
        const validator = location === 'body' ? body(field) : query(field);

        let chain = validator;

        if (required) {
            chain = chain.notEmpty().withMessage(`${field} is required`);
        } else {
            chain = chain.optional({ nullable: true });
        }

        return chain.isBoolean().withMessage(`${field} must be a boolean`).toBoolean();
    },

    // Enum validation
    enum: (field, allowedValues, options = {}) => {
        const { required = true, location = 'body' } = options;
        const validator = location === 'body' ? body(field) : query(field);

        let chain = validator.trim();

        if (required) {
            chain = chain.notEmpty().withMessage(`${field} is required`);
        } else {
            chain = chain.optional({ nullable: true });
        }

        return chain.isIn(allowedValues).withMessage(`${field} must be one of: ${allowedValues.join(', ')}`);
    },

    // Date validation
    date: (field, options = {}) => {
        const { required = false, location = 'body' } = options;
        const validator = location === 'body' ? body(field) : query(field);

        let chain = validator;

        if (required) {
            chain = chain.notEmpty().withMessage(`${field} is required`);
        } else {
            chain = chain.optional({ nullable: true });
        }

        return chain.isISO8601().withMessage(`${field} must be a valid date`);
    },

    // Array validation
    array: (field, options = {}) => {
        const { required = false, location = 'body' } = options;
        const validator = location === 'body' ? body(field) : query(field);

        let chain = validator;

        if (required) {
            chain = chain.notEmpty().withMessage(`${field} is required`);
        } else {
            chain = chain.optional({ nullable: true });
        }

        return chain.isArray().withMessage(`${field} must be an array`);
    },

    // Pagination validation
    pagination: () => [
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('Page must be a positive integer')
            .toInt(),
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('Limit must be between 1 and 100')
            .toInt(),
    ],

    // Sort validation
    sort: (allowedFields = []) => [
        query('sort_by')
            .optional()
            .isIn(allowedFields)
            .withMessage(`Sort by must be one of: ${allowedFields.join(', ')}`),
        query('sort_order')
            .optional()
            .isIn(['asc', 'desc'])
            .withMessage('Sort order must be asc or desc'),
    ],

    // Search validation
    search: () =>
        query('search')
            .optional()
            .trim()
            .isLength({ min: 1, max: 100 })
            .withMessage('Search term must be between 1 and 100 characters'),
};

module.exports = {
    validate,
    rules,
    body,
    param,
    query,
};
