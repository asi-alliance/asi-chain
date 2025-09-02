// ASI Chain Input Validation and Sanitization
// This module provides comprehensive input validation for all API endpoints

const validator = require('validator');
const joi = require('joi');
const DOMPurify = require('isomorphic-dompurify');

class InputValidator {
    constructor() {
        this.schemas = this.defineSchemas();
        this.maxStringLength = 10000;
        this.maxArrayLength = 1000;
        this.maxObjectDepth = 10;
    }

    defineSchemas() {
        return {
            // Blockchain-specific validations
            blockHash: joi.string().pattern(/^[a-fA-F0-9]{64}$/).required(),
            transactionHash: joi.string().pattern(/^[a-fA-F0-9]{64}$/).required(),
            address: joi.string().pattern(/^[a-fA-F0-9]{40}$/).required(),
            blockNumber: joi.number().integer().min(0).max(Number.MAX_SAFE_INTEGER),
            
            // API pagination
            pagination: joi.object({
                page: joi.number().integer().min(1).max(10000).default(1),
                limit: joi.number().integer().min(1).max(100).default(20),
                sort: joi.string().valid('asc', 'desc').default('desc'),
                sortBy: joi.string().pattern(/^[a-zA-Z_][a-zA-Z0-9_]*$/).max(50)
            }),
            
            // Search parameters
            search: joi.object({
                query: joi.string().min(1).max(500).required(),
                type: joi.string().valid('block', 'transaction', 'address', 'validator').required(),
                filters: joi.object().optional()
            }),
            
            // GraphQL query validation
            graphqlQuery: joi.object({
                query: joi.string().min(1).max(10000).required(),
                variables: joi.object().optional(),
                operationName: joi.string().max(100).optional()
            }),
            
            // Authentication
            loginRequest: joi.object({
                username: joi.string().alphanum().min(3).max(30).required(),
                password: joi.string().min(8).max(128).required(),
                rememberMe: joi.boolean().optional()
            }),
            
            // Wallet operations
            walletAddress: joi.string().pattern(/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^0x[a-fA-F0-9]{40}$/),
            amount: joi.string().pattern(/^\d+(\.\d{1,18})?$/).custom(this.validateAmount),
            
            // API key validation
            apiKey: joi.string().pattern(/^[a-zA-Z0-9]{32,64}$/).required()
        };
    }

    validateAmount(value, helpers) {
        // Validate cryptocurrency amounts
        const amount = parseFloat(value);
        if (isNaN(amount) || amount < 0 || amount > 1e18) {
            return helpers.error('any.invalid');
        }
        return value;
    }

    /**
     * Validate request based on endpoint type
     */
    validateRequest(type, data) {
        const schema = this.schemas[type];
        if (!schema) {
            throw new Error(`Unknown validation type: ${type}`);
        }
        
        const { error, value } = schema.validate(data, {
            stripUnknown: true,
            abortEarly: false
        });
        
        if (error) {
            throw new ValidationError('Validation failed', error.details);
        }
        
        return value;
    }

    /**
     * Sanitize input data to prevent XSS and injection attacks
     */
    sanitizeInput(input, options = {}) {
        if (typeof input === 'string') {
            return this.sanitizeString(input, options);
        } else if (Array.isArray(input)) {
            return this.sanitizeArray(input, options);
        } else if (typeof input === 'object' && input !== null) {
            return this.sanitizeObject(input, options);
        }
        
        return input;
    }

    sanitizeString(str, options = {}) {
        // Length check
        if (str.length > (options.maxLength || this.maxStringLength)) {
            throw new ValidationError('String too long');
        }
        
        // Basic XSS protection
        let sanitized = validator.escape(str);
        
        // HTML sanitization for rich text
        if (options.allowHtml) {
            sanitized = DOMPurify.sanitize(str, {
                ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
                ALLOWED_ATTR: ['href']
            });
        }
        
        // SQL injection protection
        if (options.preventSQLInjection !== false) {
            sanitized = sanitized.replace(/['"\\;]/g, '');
        }
        
        // NoSQL injection protection
        if (options.preventNoSQLInjection !== false) {
            sanitized = sanitized.replace(/[${}]/g, '');
        }
        
        return sanitized;
    }

    sanitizeArray(arr, options = {}, depth = 0) {
        if (depth > this.maxObjectDepth) {
            throw new ValidationError('Array nesting too deep');
        }
        
        if (arr.length > (options.maxLength || this.maxArrayLength)) {
            throw new ValidationError('Array too large');
        }
        
        return arr.map(item => this.sanitizeInput(item, options));
    }

    sanitizeObject(obj, options = {}, depth = 0) {
        if (depth > this.maxObjectDepth) {
            throw new ValidationError('Object nesting too deep');
        }
        
        const sanitized = {};
        let keyCount = 0;
        
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                keyCount++;
                
                // Limit number of keys to prevent DoS
                if (keyCount > 1000) {
                    throw new ValidationError('Too many object keys');
                }
                
                // Validate key name
                const sanitizedKey = this.sanitizeKey(key);
                if (!sanitizedKey) continue;
                
                // Sanitize value
                sanitized[sanitizedKey] = this.sanitizeInput(
                    obj[key], 
                    options, 
                    depth + 1
                );
            }
        }
        
        return sanitized;
    }

    sanitizeKey(key) {
        // Key validation
        if (typeof key !== 'string' || key.length > 100) {
            return null;
        }
        
        // Allow only alphanumeric and underscore
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
            return null;
        }
        
        return key;
    }

    /**
     * Validate blockchain-specific data
     */
    validateBlockchainData(type, data) {
        switch (type) {
            case 'blockHash':
                return this.validateBlockHash(data);
            case 'transactionHash':
                return this.validateTransactionHash(data);
            case 'address':
                return this.validateAddress(data);
            case 'blockNumber':
                return this.validateBlockNumber(data);
            default:
                throw new ValidationError(`Unknown blockchain data type: ${type}`);
        }
    }

    validateBlockHash(hash) {
        if (typeof hash !== 'string') {
            throw new ValidationError('Block hash must be a string');
        }
        
        if (!/^[a-fA-F0-9]{64}$/.test(hash)) {
            throw new ValidationError('Invalid block hash format');
        }
        
        return hash.toLowerCase();
    }

    validateTransactionHash(hash) {
        if (typeof hash !== 'string') {
            throw new ValidationError('Transaction hash must be a string');
        }
        
        if (!/^[a-fA-F0-9]{64}$/.test(hash)) {
            throw new ValidationError('Invalid transaction hash format');
        }
        
        return hash.toLowerCase();
    }

    validateAddress(address) {
        if (typeof address !== 'string') {
            throw new ValidationError('Address must be a string');
        }
        
        // Support multiple address formats
        const patterns = [
            /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/, // Bitcoin-style
            /^0x[a-fA-F0-9]{40}$/,               // Ethereum-style
            /^[a-fA-F0-9]{40}$/                  // Raw hex
        ];
        
        if (!patterns.some(pattern => pattern.test(address))) {
            throw new ValidationError('Invalid address format');
        }
        
        return address;
    }

    validateBlockNumber(blockNumber) {
        const num = parseInt(blockNumber);
        
        if (isNaN(num) || num < 0 || num > Number.MAX_SAFE_INTEGER) {
            throw new ValidationError('Invalid block number');
        }
        
        return num;
    }

    /**
     * Express middleware for request validation
     */
    createMiddleware(validationType, options = {}) {
        return (req, res, next) => {
            try {
                // Validate request body
                if (req.body && Object.keys(req.body).length > 0) {
                    req.body = this.sanitizeInput(req.body, options);
                    
                    if (validationType) {
                        req.body = this.validateRequest(validationType, req.body);
                    }
                }
                
                // Validate query parameters
                if (req.query && Object.keys(req.query).length > 0) {
                    req.query = this.sanitizeInput(req.query, options);
                }
                
                // Validate URL parameters
                if (req.params && Object.keys(req.params).length > 0) {
                    req.params = this.sanitizeInput(req.params, options);
                }
                
                next();
            } catch (error) {
                const statusCode = error instanceof ValidationError ? 400 : 500;
                res.status(statusCode).json({
                    error: error.message,
                    code: 'VALIDATION_ERROR',
                    details: error.details || undefined
                });
            }
        };
    }

    /**
     * Rate limiting based on input complexity
     */
    calculateComplexity(data) {
        let complexity = 0;
        
        const calculateObjectComplexity = (obj, depth = 0) => {
            if (depth > 10) return 1000; // Prevent infinite recursion
            
            let objComplexity = 0;
            
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    const value = obj[key];
                    
                    if (typeof value === 'string') {
                        objComplexity += Math.ceil(value.length / 100);
                    } else if (Array.isArray(value)) {
                        objComplexity += value.length;
                        value.forEach(item => {
                            if (typeof item === 'object') {
                                objComplexity += calculateObjectComplexity(item, depth + 1);
                            }
                        });
                    } else if (typeof value === 'object' && value !== null) {
                        objComplexity += calculateObjectComplexity(value, depth + 1);
                    }
                }
            }
            
            return objComplexity;
        };
        
        if (typeof data === 'object' && data !== null) {
            complexity = calculateObjectComplexity(data);
        } else if (typeof data === 'string') {
            complexity = Math.ceil(data.length / 100);
        }
        
        return Math.min(complexity, 1000); // Cap at 1000
    }
}

class ValidationError extends Error {
    constructor(message, details = null) {
        super(message);
        this.name = 'ValidationError';
        this.details = details;
    }
}

module.exports = { InputValidator, ValidationError };