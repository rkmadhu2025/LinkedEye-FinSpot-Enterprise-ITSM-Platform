/**
 * Database Configuration
 * PostgreSQL connection pool and query utilities
 */

const { Pool } = require('pg');
const logger = require('../utils/logger');

// Create connection pool
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'linkedeye_finspot',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    min: parseInt(process.env.DB_POOL_MIN) || 2,
    max: parseInt(process.env.DB_POOL_MAX) || 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Pool error handling
pool.on('error', (err) => {
    logger.error('Unexpected database pool error', { error: err.message });
});

pool.on('connect', () => {
    logger.debug('New database connection established');
});

/**
 * Execute a query with optional parameters
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
const query = async (text, params = []) => {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        logger.debug('Executed query', {
            text: text.substring(0, 100),
            duration,
            rows: result.rowCount
        });
        return result;
    } catch (error) {
        logger.error('Database query error', {
            text: text.substring(0, 100),
            error: error.message
        });
        throw error;
    }
};

/**
 * Get a client from the pool for transactions
 * @returns {Promise<Object>} Pool client
 */
const getClient = async () => {
    const client = await pool.connect();
    const originalQuery = client.query.bind(client);
    const release = client.release.bind(client);

    // Set a timeout to release the client
    const timeout = setTimeout(() => {
        logger.error('Client has been checked out for more than 5 seconds!');
    }, 5000);

    client.query = (...args) => {
        return originalQuery(...args);
    };

    client.release = () => {
        clearTimeout(timeout);
        return release();
    };

    return client;
};

/**
 * Execute a transaction with automatic rollback on error
 * @param {Function} callback - Transaction callback receiving client
 * @returns {Promise<any>} Transaction result
 */
const transaction = async (callback) => {
    const client = await getClient();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Check database connection health
 * @returns {Promise<boolean>} Connection status
 */
const checkHealth = async () => {
    try {
        await query('SELECT 1');
        return true;
    } catch (error) {
        logger.error('Database health check failed', { error: error.message });
        return false;
    }
};

/**
 * Close all connections in the pool
 * @returns {Promise<void>}
 */
const close = async () => {
    await pool.end();
    logger.info('Database pool closed');
};

module.exports = {
    pool,
    query,
    getClient,
    transaction,
    checkHealth,
    close
};
