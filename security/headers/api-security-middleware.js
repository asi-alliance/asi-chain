// ASI Chain - API Security Middleware
// This module provides comprehensive security middleware for Node.js applications

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const cors = require('cors');
const expressBrute = require('express-brute');
const validator = require('validator');

class APISecurityManager {
    constructor(options = {}) {
        this.options = {
            environment: process.env.NODE_ENV || 'development',
            trustProxy: options.trustProxy || 1,
            corsOrigins: options.corsOrigins || [],
            rateLimits: {
                global: options.rateLimits?.global || { windowMs: 15 * 60 * 1000, max: 1000 },
                api: options.rateLimits?.api || { windowMs: 15 * 60 * 1000, max: 100 },
                auth: options.rateLimits?.auth || { windowMs: 15 * 60 * 1000, max: 5 },
                ...options.rateLimits
            },
            ...options
        };
        
        this.bruteforce = new expressBrute(new expressBrute.MemoryStore(), {
            freeRetries: 3,
            minWait: 5 * 60 * 1000, // 5 minutes
            maxWait: 60 * 60 * 1000, // 1 hour
            lifetime: 24 * 60 * 60, // 24 hours
        });
    }

    /**
     * Get comprehensive security headers middleware
     */
    getSecurityHeaders() {
        return helmet({
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
                    baseUri: ["'self'"],
                    upgradeInsecureRequests: this.options.environment === 'production'
                }
            },
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            },
            noSniff: true,
            frameguard: { action: 'deny' },
            xssFilter: true,
            referrerPolicy: { policy: "strict-origin-when-cross-origin" },
            permittedCrossDomainPolicies: false,
            crossOriginEmbedderPolicy: true,
            crossOriginOpenerPolicy: { policy: "same-origin" },
            crossOriginResourcePolicy: { policy: "cross-origin" }
        });
    }

    /**
     * Get CORS middleware with restricted origins
     */
    getCORSMiddleware() {
        return cors({
            origin: (origin, callback) => {
                // Allow requests with no origin (mobile apps, etc.)
                if (!origin) return callback(null, true);
                
                // Check if origin is in allowed list
                if (this.options.corsOrigins.includes(origin)) {
                    return callback(null, true);
                }
                
                // For development, allow localhost
                if (this.options.environment === 'development' && 
                    (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
                    return callback(null, true);
                }
                
                return callback(new Error('Not allowed by CORS'));
            },
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
            credentials: true,
            maxAge: 86400 // 24 hours
        });
    }

    /**
     * Get global rate limiting middleware
     */
    getGlobalRateLimit() {
        return rateLimit({
            windowMs: this.options.rateLimits.global.windowMs,
            max: this.options.rateLimits.global.max,
            message: {
                error: 'Too many requests from this IP, please try again later.',
                code: 'RATE_LIMIT_EXCEEDED'
            },
            standardHeaders: true,
            legacyHeaders: false,
            trustProxy: this.options.trustProxy
        });
    }

    /**
     * Get API-specific rate limiting middleware
     */
    getAPIRateLimit() {
        return rateLimit({
            windowMs: this.options.rateLimits.api.windowMs,
            max: this.options.rateLimits.api.max,
            message: {
                error: 'API rate limit exceeded, please try again later.',
                code: 'API_RATE_LIMIT_EXCEEDED'
            },
            standardHeaders: true,
            legacyHeaders: false,
            trustProxy: this.options.trustProxy
        });
    }

    /**
     * Get authentication rate limiting middleware
     */
    getAuthRateLimit() {
        return rateLimit({
            windowMs: this.options.rateLimits.auth.windowMs,
            max: this.options.rateLimits.auth.max,
            message: {
                error: 'Too many authentication attempts, please try again later.',
                code: 'AUTH_RATE_LIMIT_EXCEEDED'
            },
            standardHeaders: true,
            legacyHeaders: false,
            trustProxy: this.options.trustProxy,
            skipSuccessfulRequests: true
        });
    }

    /**
     * Get slow-down middleware for progressive delays
     */
    getSlowDown() {
        return slowDown({
            windowMs: 15 * 60 * 1000, // 15 minutes
            delayAfter: 50, // allow 50 requests per 15 minutes, then...
            delayMs: 500, // begin adding 500ms of delay per request above 50
            maxDelayMs: 20000, // maximum of 20 seconds delay
            trustProxy: this.options.trustProxy
        });
    }

    /**
     * Get brute force protection middleware
     */
    getBruteForceProtection() {
        return this.bruteforce.prevent;
    }

    /**
     * Input validation middleware
     */
    getInputValidation() {
        return (req, res, next) => {
            // Validate and sanitize common inputs
            if (req.body) {
                this.sanitizeObject(req.body);
            }
            
            if (req.query) {
                this.sanitizeObject(req.query);
            }
            
            if (req.params) {
                this.sanitizeObject(req.params);
            }
            
            next();
        };
    }

    /**
     * Sanitize object recursively
     */
    sanitizeObject(obj) {
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                if (typeof obj[key] === 'string') {
                    // Basic XSS protection
                    obj[key] = validator.escape(obj[key]);
                    
                    // SQL injection protection (basic)
                    obj[key] = obj[key].replace(/['"\\;]/g, '');
                    
                    // Limit string length
                    if (obj[key].length > 1000) {
                        obj[key] = obj[key].substring(0, 1000);
                    }
                } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    this.sanitizeObject(obj[key]);
                }
            }
        }
    }

    /**
     * Request size limiting middleware
     */
    getRequestSizeLimit() {
        return (req, res, next) => {
            const contentLength = parseInt(req.get('content-length') || '0');
            const maxSize = 1024 * 1024; // 1MB
            
            if (contentLength > maxSize) {
                return res.status(413).json({
                    error: 'Request entity too large',
                    code: 'REQUEST_TOO_LARGE',
                    maxSize: maxSize
                });
            }
            
            next();
        };
    }

    /**
     * Security audit logging middleware
     */
    getSecurityAuditLogger() {
        return (req, res, next) => {
            const start = Date.now();
            
            res.on('finish', () => {
                const duration = Date.now() - start;
                const logData = {
                    timestamp: new Date().toISOString(),
                    method: req.method,
                    url: req.originalUrl,
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    statusCode: res.statusCode,
                    duration: duration,
                    contentLength: res.get('content-length') || 0
                };
                
                // Log suspicious activities
                if (res.statusCode >= 400 || duration > 5000) {
                    console.warn('Security Audit:', JSON.stringify(logData));
                }
            });
            
            next();
        };
    }

    /**
     * Get complete security middleware stack
     */
    getSecurityStack() {
        return [
            this.getSecurityHeaders(),
            this.getCORSMiddleware(),
            this.getGlobalRateLimit(),
            this.getSlowDown(),
            this.getInputValidation(),
            this.getRequestSizeLimit(),
            this.getSecurityAuditLogger()
        ];
    }

    /**
     * Get API-specific security stack
     */
    getAPISecurityStack() {
        return [
            this.getSecurityHeaders(),
            this.getCORSMiddleware(),
            this.getAPIRateLimit(),
            this.getSlowDown(),
            this.getInputValidation(),
            this.getRequestSizeLimit(),
            this.getSecurityAuditLogger()
        ];
    }

    /**
     * Get authentication-specific security stack
     */
    getAuthSecurityStack() {
        return [
            this.getSecurityHeaders(),
            this.getCORSMiddleware(),
            this.getAuthRateLimit(),
            this.getBruteForceProtection(),
            this.getInputValidation(),
            this.getRequestSizeLimit(),
            this.getSecurityAuditLogger()
        ];
    }
}

module.exports = APISecurityManager;