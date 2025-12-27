/**
 * LinkedEye-FinSpot ITSM Platform
 * Main Server Entry Point
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const logger = require('./utils/logger');
const db = require('./config/database');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const roleRoutes = require('./routes/roles');
const groupRoutes = require('./routes/groups');
const incidentRoutes = require('./routes/incidents');
const changeRoutes = require('./routes/changes');
const assetRoutes = require('./routes/assets');
const environmentRoutes = require('./routes/environments');
const dashboardRoutes = require('./routes/dashboard');
const reportRoutes = require('./routes/reports');
const settingsRoutes = require('./routes/settings');

// Create Express app
const app = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disabled for API
    crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
    origin: config.cors.origin,
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// HTTP request logging
if (config.server.env !== 'test') {
    app.use(morgan('combined', { stream: logger.stream }));
}

// Rate limiting
const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: {
        success: false,
        message: 'Too many requests, please try again later',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Health check endpoint
app.get('/health', async (req, res) => {
    const dbHealthy = await db.checkHealth();
    const status = dbHealthy ? 'healthy' : 'unhealthy';

    res.status(dbHealthy ? 200 : 503).json({
        status,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: dbHealthy ? 'connected' : 'disconnected',
        version: process.env.npm_package_version || '1.0.0',
    });
});

// API version info
app.get('/api', (req, res) => {
    res.json({
        name: 'LinkedEye-FinSpot API',
        version: '1.0.0',
        documentation: '/api/docs',
        endpoints: {
            auth: '/api/auth',
            users: '/api/users',
            roles: '/api/roles',
            groups: '/api/groups',
            incidents: '/api/incidents',
            changes: '/api/changes',
            assets: '/api/assets',
            environments: '/api/environments',
            dashboard: '/api/dashboard',
            reports: '/api/reports',
            settings: '/api/settings',
        },
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/changes', changeRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/environments', environmentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server
const PORT = config.server.port;
const HOST = config.server.host;

const server = app.listen(PORT, HOST, () => {
    logger.info(`Server started`, {
        host: HOST,
        port: PORT,
        env: config.server.env,
        url: `http://${HOST}:${PORT}`,
    });
});

// Graceful shutdown
const shutdown = async (signal) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    server.close(async () => {
        logger.info('HTTP server closed');

        try {
            await db.close();
            logger.info('Database connections closed');
            process.exit(0);
        } catch (error) {
            logger.error('Error during shutdown', { error: error.message });
            process.exit(1);
        }
    });

    // Force exit if graceful shutdown takes too long
    setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
    }, 30000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', { reason, promise });
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
    process.exit(1);
});

module.exports = app;
