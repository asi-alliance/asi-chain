// ASI Chain - Secrets Management Loader
// This module provides secure secrets loading from AWS Secrets Manager

const AWS = require('aws-sdk');

class SecretsManager {
    constructor(region = process.env.AWS_REGION || 'us-east-1') {
        this.client = new AWS.SecretsManager({
            region: region
        });
        this.prefix = process.env.AWS_SECRET_PREFIX || 'asi-chain';
        this.cache = new Map();
        this.cacheTimeout = 300000; // 5 minutes
    }

    /**
     * Retrieve a secret value from AWS Secrets Manager
     * @param {string} secretName - Name of the secret (without prefix)
     * @param {boolean} useCache - Whether to use local cache
     * @returns {Promise<string|object>} Secret value
     */
    async getSecret(secretName, useCache = true) {
        const fullSecretName = `${this.prefix}/${secretName}`;
        
        // Check cache first
        if (useCache && this.cache.has(fullSecretName)) {
            const cached = this.cache.get(fullSecretName);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.value;
            }
            this.cache.delete(fullSecretName);
        }

        try {
            const response = await this.client.getSecretValue({
                SecretId: fullSecretName
            }).promise();

            let secretValue;
            if (response.SecretString) {
                try {
                    secretValue = JSON.parse(response.SecretString);
                } catch (e) {
                    secretValue = response.SecretString;
                }
            }

            // Cache the result
            if (useCache) {
                this.cache.set(fullSecretName, {
                    value: secretValue,
                    timestamp: Date.now()
                });
            }

            return secretValue;
        } catch (error) {
            console.error(`Failed to retrieve secret ${fullSecretName}:`, error.message);
            
            // Fallback to environment variable for development
            if (process.env.NODE_ENV === 'development') {
                const envVar = `ASI_${secretName.toUpperCase().replace(/-/g, '_')}`;
                const fallback = process.env[envVar];
                if (fallback) {
                    console.warn(`Using fallback environment variable: ${envVar}`);
                    return fallback;
                }
            }
            
            throw new Error(`Secret ${secretName} not found and no fallback available`);
        }
    }

    /**
     * Load database configuration from secrets
     * @returns {Promise<object>} Database configuration
     */
    async getDatabaseConfig() {
        const config = await this.getSecret('database-config');
        return {
            host: config.host,
            port: parseInt(config.port),
            database: config.database,
            user: config.username,
            password: config.password,
            ssl: config.ssl,
            pool: {
                max: config.pool_size
            }
        };
    }

    /**
     * Load API security configuration from secrets
     * @returns {Promise<object>} API configuration
     */
    async getAPIConfig() {
        return await this.getSecret('api-config');
    }

    /**
     * Load Hasura admin secret
     * @returns {Promise<string>} Hasura admin secret
     */
    async getHasuraSecret() {
        return await this.getSecret('hasura-admin-secret');
    }

    /**
     * Load JWT secret for token signing
     * @returns {Promise<string>} JWT secret
     */
    async getJWTSecret() {
        return await this.getSecret('jwt-secret');
    }

    /**
     * Load encryption key for sensitive data
     * @returns {Promise<string>} Encryption key
     */
    async getEncryptionKey() {
        return await this.getSecret('encryption-key');
    }

    /**
     * Clear all cached secrets (useful for secret rotation)
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Health check - verify secrets manager connectivity
     * @returns {Promise<boolean>} True if healthy
     */
    async healthCheck() {
        try {
            await this.client.listSecrets({
                Filters: [{
                    Key: 'name',
                    Values: [`${this.prefix}/`]
                }],
                MaxResults: 1
            }).promise();
            return true;
        } catch (error) {
            console.error('Secrets Manager health check failed:', error.message);
            return false;
        }
    }
}

module.exports = SecretsManager;