/**
 * Helper Utilities
 * Common utility functions used across the application
 */

const crypto = require('crypto');

/**
 * Generate a random UUID v4
 * @returns {string} UUID
 */
const generateUUID = () => {
    return crypto.randomUUID();
};

/**
 * Generate a random token
 * @param {number} bytes - Number of bytes
 * @returns {string} Hex token
 */
const generateToken = (bytes = 32) => {
    return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Hash a string using SHA-256
 * @param {string} value - String to hash
 * @returns {string} Hashed string
 */
const hashString = (value) => {
    return crypto.createHash('sha256').update(value).digest('hex');
};

/**
 * Parse pagination parameters from query
 * @param {Object} query - Request query object
 * @param {Object} defaults - Default values
 * @returns {Object} Pagination params
 */
const parsePagination = (query, defaults = { page: 1, limit: 20, maxLimit: 100 }) => {
    let page = parseInt(query.page) || defaults.page;
    let limit = parseInt(query.limit) || defaults.limit;

    page = Math.max(1, page);
    limit = Math.min(Math.max(1, limit), defaults.maxLimit);

    const offset = (page - 1) * limit;

    return { page, limit, offset };
};

/**
 * Parse sort parameters from query
 * @param {Object} query - Request query object
 * @param {Array} allowedFields - Allowed sort fields
 * @param {string} defaultSort - Default sort field
 * @returns {Object} Sort params
 */
const parseSort = (query, allowedFields = [], defaultSort = 'created_at') => {
    let sortBy = query.sort_by || query.sortBy || defaultSort;
    let sortOrder = (query.sort_order || query.sortOrder || 'desc').toLowerCase();

    // Validate sort field
    if (!allowedFields.includes(sortBy)) {
        sortBy = defaultSort;
    }

    // Validate sort order
    if (!['asc', 'desc'].includes(sortOrder)) {
        sortOrder = 'desc';
    }

    return { sortBy, sortOrder };
};

/**
 * Parse filter parameters from query
 * @param {Object} query - Request query object
 * @param {Array} allowedFilters - Allowed filter fields
 * @returns {Object} Filter params
 */
const parseFilters = (query, allowedFilters = []) => {
    const filters = {};

    allowedFilters.forEach((field) => {
        if (query[field] !== undefined && query[field] !== '') {
            filters[field] = query[field];
        }
    });

    return filters;
};

/**
 * Build SQL WHERE clause from filters
 * @param {Object} filters - Filter object
 * @param {number} startIndex - Parameter start index
 * @returns {Object} { clause, params, nextIndex }
 */
const buildWhereClause = (filters, startIndex = 1) => {
    const conditions = [];
    const params = [];
    let index = startIndex;

    Object.entries(filters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
            conditions.push(`${key} = ANY($${index})`);
            params.push(value);
        } else if (typeof value === 'string' && value.includes('%')) {
            conditions.push(`${key} ILIKE $${index}`);
            params.push(value);
        } else {
            conditions.push(`${key} = $${index}`);
            params.push(value);
        }
        index++;
    });

    return {
        clause: conditions.length > 0 ? conditions.join(' AND ') : '1=1',
        params,
        nextIndex: index,
    };
};

/**
 * Sanitize string for SQL LIKE
 * @param {string} value - Input string
 * @returns {string} Sanitized string
 */
const sanitizeLikeString = (value) => {
    return value.replace(/[%_\\]/g, '\\$&');
};

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
const deepClone = (obj) => {
    return JSON.parse(JSON.stringify(obj));
};

/**
 * Remove undefined and null values from object
 * @param {Object} obj - Object to clean
 * @returns {Object} Cleaned object
 */
const cleanObject = (obj) => {
    return Object.fromEntries(
        Object.entries(obj).filter(([_, value]) => value !== undefined && value !== null)
    );
};

/**
 * Format date for display
 * @param {Date|string} date - Date to format
 * @param {string} format - Format type
 * @returns {string} Formatted date
 */
const formatDate = (date, format = 'iso') => {
    const d = new Date(date);

    switch (format) {
        case 'iso':
            return d.toISOString();
        case 'date':
            return d.toISOString().split('T')[0];
        case 'datetime':
            return d.toISOString().replace('T', ' ').split('.')[0];
        case 'time':
            return d.toISOString().split('T')[1].split('.')[0];
        default:
            return d.toISOString();
    }
};

/**
 * Calculate time difference in human readable format
 * @param {Date|string} date - Date to compare
 * @returns {string} Human readable time difference
 */
const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);

    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60,
        second: 1,
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return `${interval} ${unit}${interval !== 1 ? 's' : ''} ago`;
        }
    }

    return 'just now';
};

/**
 * Get initials from name
 * @param {string} firstName - First name
 * @param {string} lastName - Last name
 * @returns {string} Initials
 */
const getInitials = (firstName, lastName) => {
    const first = (firstName || '').charAt(0).toUpperCase();
    const last = (lastName || '').charAt(0).toUpperCase();
    return `${first}${last}`;
};

/**
 * Slugify a string
 * @param {string} text - Text to slugify
 * @returns {string} Slugified text
 */
const slugify = (text) => {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};

/**
 * Truncate string to specified length
 * @param {string} str - String to truncate
 * @param {number} length - Max length
 * @param {string} suffix - Suffix to add
 * @returns {string} Truncated string
 */
const truncate = (str, length = 100, suffix = '...') => {
    if (!str || str.length <= length) return str;
    return str.substring(0, length - suffix.length) + suffix;
};

/**
 * Check if string is valid UUID
 * @param {string} str - String to check
 * @returns {boolean} Is valid UUID
 */
const isValidUUID = (str) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
};

/**
 * Check if string is valid email
 * @param {string} email - Email to check
 * @returns {boolean} Is valid email
 */
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Calculate SLA status
 * @param {Date} dueDate - SLA due date
 * @param {Date} completedDate - Completion date (null if not completed)
 * @param {number} warningThreshold - Warning threshold percentage
 * @returns {Object} SLA status info
 */
const calculateSLAStatus = (dueDate, completedDate = null, warningThreshold = 75) => {
    const now = new Date();
    const due = new Date(dueDate);

    if (completedDate) {
        const completed = new Date(completedDate);
        return {
            status: completed <= due ? 'met' : 'breached',
            isBreached: completed > due,
            remainingMs: 0,
            percentageUsed: 100,
        };
    }

    const remainingMs = due - now;
    const totalMs = due - new Date(due.getTime() - 24 * 60 * 60 * 1000); // Assuming 24h SLA
    const percentageUsed = Math.min(100, Math.round(((totalMs - remainingMs) / totalMs) * 100));

    if (remainingMs < 0) {
        return {
            status: 'breached',
            isBreached: true,
            remainingMs: 0,
            percentageUsed: 100,
        };
    }

    if (percentageUsed >= warningThreshold) {
        return {
            status: 'at_risk',
            isBreached: false,
            remainingMs,
            percentageUsed,
        };
    }

    return {
        status: 'on_track',
        isBreached: false,
        remainingMs,
        percentageUsed,
    };
};

module.exports = {
    generateUUID,
    generateToken,
    hashString,
    parsePagination,
    parseSort,
    parseFilters,
    buildWhereClause,
    sanitizeLikeString,
    deepClone,
    cleanObject,
    formatDate,
    timeAgo,
    getInitials,
    slugify,
    truncate,
    isValidUUID,
    isValidEmail,
    calculateSLAStatus,
};
