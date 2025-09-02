// ASI Chain API Gateway Security Configuration
// This module provides comprehensive API security, rate limiting, and validation

const express = require('express');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const helmet = require('helmet');
const cors = require('cors');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class APIGateway {
    constructor(options = {}) {
        this.app = express();
        this.options = {
            environment: process.env.NODE_ENV || 'development',
            jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
            allowedOrigins: process.env.CORS_ALLOWED_ORIGINS?.split(' ') || [],
            rateLimits: {
                global: { windowMs: 15 * 60 * 1000, max: 1000 }, // 1000 requests per 15 minutes
                api: { windowMs: 15 * 60 * 1000, max: 100 },     // 100 API calls per 15 minutes
                auth: { windowMs: 15 * 60 * 1000, max: 5 },      // 5 auth attempts per 15 minutes
                graphql: { windowMs: 60 * 1000, max: 10 },       // 10 GraphQL queries per minute
                ...options.rateLimits
            },
            ...options
        };
        
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        // Trust proxy for accurate IP addresses
        this.app.set('trust proxy', 1);

        // Security headers
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'"],
                    fontSrc: ["'self'"],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'"],
                    frameSrc: ["'none'"],
                    childSrc: ["'none'"],
                    workerSrc: ["'self'"],
                    frameAncestors: ["'none'"],
                    formAction: ["'self'"],
                    baseUri: ["'self'"]
                }
            },
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            }
        }));

        // CORS configuration
        this.app.use(cors({
            origin: (origin, callback) => {
                if (!origin) return callback(null, true);
                
                if (this.options.allowedOrigins.includes(origin)) {
                    return callback(null, true);
                }
                
                if (this.options.environment === 'development' && 
                    (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
                    return callback(null, true);
                }
                
                return callback(new Error('Not allowed by CORS'));
            },
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
            credentials: true
        }));

        // Request parsing with size limits
        this.app.use(express.json({ 
            limit: '100kb',
            verify: this.verifyRequestIntegrity.bind(this)
        }));
        this.app.use(express.urlencoded({ 
            extended: true, 
            limit: '100kb' 
        }));

        // Global rate limiting
        this.app.use(this.createRateLimit('global'));

        // Request logging and monitoring
        this.app.use(this.createRequestLogger());

        // Input validation and sanitization
        this.app.use(this.createInputValidator());
    }

    createRateLimit(type) {
        const config = this.options.rateLimits[type];
        
        return rateLimit({
            windowMs: config.windowMs,
            max: config.max,
            message: {
                error: `Rate limit exceeded for ${type}`,
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: Math.ceil(config.windowMs / 1000)
            },
            standardHeaders: true,
            legacyHeaders: false,
            handler: (req, res) => {
                this.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
                    type: type,
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    path: req.path
                });
                
                res.status(429).json({
                    error: `Rate limit exceeded for ${type}`,
                    code: 'RATE_LIMIT_EXCEEDED',
                    retryAfter: Math.ceil(config.windowMs / 1000)
                });
            }
        });
    }

    createSlowDown(type) {
        const config = this.options.rateLimits[type];
        
        return slowDown({
            windowMs: config.windowMs,
            delayAfter: Math.floor(config.max * 0.7), // Start slowing down at 70% of limit
            delayMs: 500,
            maxDelayMs: 20000
        });
    }

    createRequestLogger() {
        return (req, res, next) => {
            const start = Date.now();
            const requestId = crypto.randomUUID();
            
            req.requestId = requestId;
            req.startTime = start;
            
            res.on('finish', () => {
                const duration = Date.now() - start;
                const logData = {
                    requestId,
                    timestamp: new Date().toISOString(),
                    method: req.method,
                    url: req.originalUrl,
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    statusCode: res.statusCode,
                    duration,
                    contentLength: res.get('content-length') || 0
                };
                
                // Log slow requests or errors
                if (res.statusCode >= 400 || duration > 2000) {
                    console.warn('API Request Alert:', JSON.stringify(logData));
                }
                
                // Security monitoring
                if (res.statusCode === 401 || res.statusCode === 403) {
                    this.logSecurityEvent('UNAUTHORIZED_ACCESS', logData);
                }
            });
            
            next();
        };
    }

    createInputValidator() {
        return (req, res, next) => {
            try {
                // Validate and sanitize request body
                if (req.body && typeof req.body === 'object') {
                    req.body = this.sanitizeObject(req.body);
                }
                
                // Validate and sanitize query parameters
                if (req.query && typeof req.query === 'object') {
                    req.query = this.sanitizeObject(req.query);
                }
                
                // Validate and sanitize URL parameters
                if (req.params && typeof req.params === 'object') {
                    req.params = this.sanitizeObject(req.params);
                }
                
                next();
            } catch (error) {
                res.status(400).json({
                    error: 'Invalid input data',
                    code: 'VALIDATION_ERROR'
                });
            }
        };
    }

    sanitizeObject(obj, depth = 0) {
        if (depth > 10) { // Prevent deep nesting attacks
            throw new Error('Object nesting too deep');
        }
        
        const sanitized = {};
        
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];
                
                // Validate key
                if (typeof key !== 'string' || key.length > 100) {
                    continue; // Skip invalid keys
                }
                
                if (typeof value === 'string') {
                    // String validation and sanitization
                    if (value.length > 10000) {
                        throw new Error('String value too long');
                    }
                    
                    // Basic XSS protection
                    let sanitized_value = validator.escape(value);
                    
                    // SQL injection protection
                    sanitized_value = sanitized_value.replace(/['"\\;]/g, '');
                    
                    sanitized[key] = sanitized_value;
                } else if (typeof value === 'number') {
                    // Number validation
                    if (isNaN(value) || !isFinite(value)) {
                        continue; // Skip invalid numbers
                    }
                    sanitized[key] = value;
                } else if (typeof value === 'boolean') {
                    sanitized[key] = value;
                } else if (Array.isArray(value)) {
                    // Array validation
                    if (value.length > 1000) {
                        throw new Error('Array too large');
                    }
                    sanitized[key] = value.map(item => 
                        typeof item === 'object' ? 
                        this.sanitizeObject(item, depth + 1) : 
                        item
                    );
                } else if (typeof value === 'object' && value !== null) {
                    sanitized[key] = this.sanitizeObject(value, depth + 1);
                }
            }
        }
        
        return sanitized;
    }

    verifyRequestIntegrity(req, buf, encoding) {
        // Verify request integrity and detect tampering
        const contentLength = parseInt(req.get('content-length') || '0');
        
        if (buf.length !== contentLength) {
            throw new Error('Content length mismatch');
        }
        
        // Additional integrity checks can be added here
    }

    createJWTMiddleware() {
        return (req, res, next) => {
            const token = req.headers.authorization?.replace('Bearer ', '');
            
            if (!token) {
                return res.status(401).json({
                    error: 'Authorization token required',
                    code: 'TOKEN_REQUIRED'
                });
            }
            
            try {
                const decoded = jwt.verify(token, this.options.jwtSecret);
                req.user = decoded;
                next();
            } catch (error) {
                this.logSecurityEvent('INVALID_TOKEN', {
                    ip: req.ip,
                    token: token.substring(0, 10) + '...',
                    error: error.message
                });
                
                res.status(401).json({
                    error: 'Invalid authorization token',
                    code: 'INVALID_TOKEN'
                });
            }
        };
    }

    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: '2.0'
            });
        });

        // API routes with specific rate limiting
        this.app.use('/api', this.createRateLimit('api'));
        this.app.use('/api', this.createSlowDown('api'));

        // GraphQL endpoint with strict rate limiting
        this.app.use('/graphql', this.createRateLimit('graphql'));

        // Authentication endpoints with very strict rate limiting
        this.app.use('/auth', this.createRateLimit('auth'));

        // Protected API routes
        this.app.use('/api/protected', this.createJWTMiddleware());

        // Error handling middleware
        this.app.use(this.createErrorHandler());
    }

    createErrorHandler() {
        return (error, req, res, next) => {
            // Log security-relevant errors
            if (error.type === 'entity.parse.failed' || 
                error.message.includes('Unexpected token') ||
                error.status === 400) {
                this.logSecurityEvent('MALFORMED_REQUEST', {
                    ip: req.ip,
                    path: req.path,
                    error: error.message,
                    requestId: req.requestId
                });
            }
            
            // Don't expose internal errors in production
            const isDevelopment = this.options.environment === 'development';
            
            res.status(error.status || 500).json({
                error: isDevelopment ? error.message : 'Internal server error',
                code: 'INTERNAL_ERROR',
                requestId: req.requestId
            });
        };
    }

    logSecurityEvent(eventType, details) {
        const event = {
            timestamp: new Date().toISOString(),
            eventType,
            severity: this.getEventSeverity(eventType),
            details
        };
        
        console.warn('Security Event:', JSON.stringify(event));
        
        // Send to security monitoring system
        // this.sendToSecurityMonitoring(event);
    }

    getEventSeverity(eventType) {
        const severityMap = {
            'RATE_LIMIT_EXCEEDED': 'MEDIUM',
            'UNAUTHORIZED_ACCESS': 'HIGH',
            'INVALID_TOKEN': 'HIGH',
            'MALFORMED_REQUEST': 'LOW',
            'BRUTE_FORCE_DETECTED': 'CRITICAL'
        };
        
        return severityMap[eventType] || 'MEDIUM';
    }

    start(port = 3000) {
        this.app.listen(port, () => {
            console.log(`ASI Chain API Gateway running on port ${port}`);
        });
    }
}

module.exports = APIGateway;