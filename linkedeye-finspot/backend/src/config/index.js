/**
 * Application Configuration
 * Centralized configuration management
 */

require('dotenv').config();

const config = {
    // Server
    server: {
        env: process.env.NODE_ENV || 'development',
        port: parseInt(process.env.PORT) || 3000,
        host: process.env.HOST || 'localhost',
    },

    // Database
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        name: process.env.DB_NAME || 'linkedeye_finspot',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        ssl: process.env.DB_SSL === 'true',
        poolMin: parseInt(process.env.DB_POOL_MIN) || 2,
        poolMax: parseInt(process.env.DB_POOL_MAX) || 10,
    },

    // JWT
    jwt: {
        secret: process.env.JWT_SECRET || 'development_secret_change_in_production',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh_secret_change_in_production',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },

    // Password Hashing
    bcrypt: {
        rounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
    },

    // Rate Limiting
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    },

    // File Upload
    upload: {
        maxSizeMB: parseInt(process.env.UPLOAD_MAX_SIZE_MB) || 10,
        allowedTypes: (process.env.UPLOAD_ALLOWED_TYPES || 'image/jpeg,image/png,application/pdf').split(','),
        destination: process.env.UPLOAD_DESTINATION || './uploads',
    },

    // Logging
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: process.env.LOG_FORMAT || 'combined',
    },

    // CORS
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:5500',
        credentials: true,
    },

    // Session
    session: {
        secret: process.env.SESSION_SECRET || 'session_secret_change_in_production',
    },

    // Email
    email: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        user: process.env.SMTP_USER,
        password: process.env.SMTP_PASSWORD,
        from: process.env.SMTP_FROM || 'noreply@finspot.com',
    },

    // Frontend URL
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5500',

    // Pagination defaults
    pagination: {
        defaultPage: 1,
        defaultLimit: 20,
        maxLimit: 100,
    },

    // SLA defaults (in minutes)
    sla: {
        warningThreshold: 75, // percentage
    },
};

// Validation for production environment
if (config.server.env === 'production') {
    const requiredEnvVars = [
        'JWT_SECRET',
        'JWT_REFRESH_SECRET',
        'DB_PASSWORD',
        'SESSION_SECRET',
    ];

    requiredEnvVars.forEach((envVar) => {
        if (!process.env[envVar]) {
            throw new Error(`Missing required environment variable: ${envVar}`);
        }
    });

    // Ensure secrets are not default values
    if (config.jwt.secret.includes('development') || config.jwt.secret.includes('change_in_production')) {
        throw new Error('JWT_SECRET must be changed for production');
    }
}

module.exports = config;
