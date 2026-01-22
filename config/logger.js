/**
 * Logger Configuration
 * =====================
 * Winston logger setup with file rotation, multiple transports, and structured logging
 */

import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logs directory if it doesn't exist
import fs from 'fs';
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for logs
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
  winston.format.json()
);

// Console format (prettier for terminal)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ level, message, timestamp, metadata, ...rest }) => {
    const meta = Object.keys(metadata).length > 0 ? ` ${JSON.stringify(metadata)}` : '';
    return `${timestamp} [${level}]: ${message}${meta}`;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  defaultMeta: { service: 'verve-blog-api' },
  transports: [
    // Console transport (development-friendly)
    new winston.transports.Console({
      format: consoleFormat,
      level: process.env.LOG_LEVEL || 'info'
    }),

    // All logs file
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),

    // Error logs only
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
      tailable: true
    }),

    // Audit logs (sensitive operations)
    new winston.transports.File({
      filename: path.join(logsDir, 'audit.log'),
      maxsize: 5242880,
      maxFiles: 10,
      tailable: true,
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.json()
      )
    })
  ]
});

// Catch unhandled exceptions
logger.exceptions.handle(
  new winston.transports.File({
    filename: path.join(logsDir, 'exceptions.log'),
    maxsize: 5242880,
    maxFiles: 5,
    tailable: true
  })
);

// Catch unhandled promise rejections
logger.rejections.handle(
  new winston.transports.File({
    filename: path.join(logsDir, 'rejections.log'),
    maxsize: 5242880,
    maxFiles: 5,
    tailable: true
  })
);

export default logger;
