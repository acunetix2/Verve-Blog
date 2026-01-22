/**
 * Morgan HTTP Logging Middleware
 * =============================
 * Custom Morgan format for comprehensive HTTP request/response logging
 */

import morgan from 'morgan';
import logger from '../config/logger.js';

// Custom Morgan token for request ID
morgan.token('request-id', (req) => req.id || 'unknown');

// Custom Morgan token for response time
morgan.token('response-time-ms', (req, res) => {
  if (!req._startAt || !res._startAt) return '0ms';
  const ms = (res._startAt[0] - req._startAt[0]) * 1e3 +
             (res._startAt[1] - req._startAt[1]) * 1e-6;
  return `${ms.toFixed(2)}ms`;
});

// Custom Morgan token for user ID
morgan.token('user-id', (req) => {
  return req.user?.id || req.userId || 'anonymous';
});

// Morgan stream for Winston
const stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

// Combined format with additional details
const morganFormat = ':request-id | :method :url :status | :response-time-ms | User: :user-id | :res[content-length] bytes';

/**
 * Create Morgan middleware with Winston integration
 */
export const createMorganMiddleware = () => {
  return morgan(morganFormat, { stream });
};

/**
 * Detailed format (for debugging)
 */
export const detailedMorganFormat = ':request-id | :date[iso] | :method :url | Status: :status | Response: :response-time-ms | Size: :res[content-length] | User: :user-id | Agent: :user-agent';

export default createMorganMiddleware;
