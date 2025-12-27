/**
 * Logger Utility
 * Winston-based logging with console and file transports
 */

const winston = require('winston');
const path = require('path');

const logLevel = process.env.LOG_LEVEL || 'info';

// Custom log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, ...metadata }) => {
        let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
        if (Object.keys(metadata).length > 0) {
            msg += ` ${JSON.stringify(metadata)}`;
        }
        return msg;
    })
);

// Console format with colors
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...metadata }) => {
        let msg = `${timestamp} ${level}: ${message}`;
        if (Object.keys(metadata).length > 0 && process.env.NODE_ENV !== 'production') {
            msg += ` ${JSON.stringify(metadata)}`;
        }
        return msg;
    })
);

// Transports
const transports = [
    new winston.transports.Console({
        format: consoleFormat,
    }),
];

// Add file transports in production
if (process.env.NODE_ENV === 'production') {
    transports.push(
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/error.log'),
            level: 'error',
            format: logFormat,
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/combined.log'),
            format: logFormat,
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        })
    );
}

// Create logger instance
const logger = winston.createLogger({
    level: logLevel,
    format: logFormat,
    transports,
    exitOnError: false,
});

// Stream for Morgan HTTP logging
logger.stream = {
    write: (message) => {
        logger.info(message.trim());
    },
};

module.exports = logger;
