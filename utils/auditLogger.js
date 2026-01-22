/**
 * Audit Logger Utility
 * ====================
 * Logs sensitive operations like login, user creation, deletions, etc.
 */

import logger from '../config/logger.js';

/**
 * Log audit events (security-sensitive operations)
 */
export const auditLog = (action, userId, details = {}) => {
  const auditEntry = {
    action,
    userId: userId || 'anonymous',
    timestamp: new Date().toISOString(),
    details,
    level: 'audit'
  };

  logger.info(`AUDIT: ${action}`, { metadata: auditEntry });
};

/**
 * Log authentication events
 */
export const logAuth = {
  login: (userId, method = 'email', success = true, reason = null) => {
    auditLog('USER_LOGIN', userId, {
      method,
      success,
      failureReason: reason,
      timestamp: new Date().toISOString()
    });
  },

  logout: (userId) => {
    auditLog('USER_LOGOUT', userId, {
      timestamp: new Date().toISOString()
    });
  },

  loginFailed: (email, reason) => {
    auditLog('LOGIN_FAILED', email, {
      reason,
      timestamp: new Date().toISOString()
    });
  },

  passwordReset: (userId, success = true) => {
    auditLog('PASSWORD_RESET', userId, {
      success,
      timestamp: new Date().toISOString()
    });
  },

  twoFactorEnabled: (userId) => {
    auditLog('2FA_ENABLED', userId, {
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Log user management events
 */
export const logUserActions = {
  userCreated: (newUserId, createdBy) => {
    auditLog('USER_CREATED', createdBy, {
      newUserId,
      timestamp: new Date().toISOString()
    });
  },

  userDeleted: (deletedUserId, deletedBy) => {
    auditLog('USER_DELETED', deletedBy, {
      deletedUserId,
      timestamp: new Date().toISOString()
    });
  },

  userRoleChanged: (userId, oldRole, newRole, changedBy) => {
    auditLog('USER_ROLE_CHANGED', changedBy, {
      userId,
      oldRole,
      newRole,
      timestamp: new Date().toISOString()
    });
  },

  userSuspended: (userId, suspendedBy, reason) => {
    auditLog('USER_SUSPENDED', suspendedBy, {
      userId,
      reason,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Log content management events
 */
export const logContentActions = {
  postCreated: (postId, userId, title) => {
    auditLog('POST_CREATED', userId, {
      postId,
      title,
      timestamp: new Date().toISOString()
    });
  },

  postDeleted: (postId, userId, deletedBy) => {
    auditLog('POST_DELETED', deletedBy, {
      postId,
      userId,
      timestamp: new Date().toISOString()
    });
  },

  postPublished: (postId, userId) => {
    auditLog('POST_PUBLISHED', userId, {
      postId,
      timestamp: new Date().toISOString()
    });
  },

  documentUploaded: (docId, userId, fileName) => {
    auditLog('DOCUMENT_UPLOADED', userId, {
      docId,
      fileName,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Log API errors
 */
export const logError = (action, userId, error, context = {}) => {
  logger.error(`ERROR: ${action}`, {
    userId: userId || 'unknown',
    errorMessage: error.message,
    errorStack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
};

/**
 * Log API access patterns (security analysis)
 */
export const logApiAccess = (endpoint, userId, statusCode, duration, method = 'GET') => {
  logger.info(`API_ACCESS`, {
    endpoint,
    method,
    statusCode,
    duration: `${duration}ms`,
    userId: userId || 'anonymous',
    timestamp: new Date().toISOString()
  });
};

export default {
  auditLog,
  logAuth,
  logUserActions,
  logContentActions,
  logError,
  logApiAccess
};
