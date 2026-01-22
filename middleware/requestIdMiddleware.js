/**
 * Request ID Middleware
 * ====================
 * Adds unique request IDs to all requests for tracing
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Middleware to attach unique request ID to each request
 * This allows tracking requests through logs and responses
 */
export const requestIdMiddleware = (req, res, next) => {
  // Check if request ID already exists (for forwarded requests)
  const requestId = req.headers['x-request-id'] || uuidv4();
  
  // Attach to request and response
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  // Attach to metadata for logging
  req.metadata = {
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString(),
  };

  // Add timing for performance tracking
  const startTime = Date.now();
  
  // Override res.json to log response details
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - startTime;
    res.locals.duration = duration;
    res.locals.statusCode = res.statusCode;
    return originalJson.call(this, data);
  };

  next();
};

export default requestIdMiddleware;
