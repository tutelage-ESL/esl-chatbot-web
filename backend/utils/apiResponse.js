/**
 * API Response Utilities
 * Standardized response helpers for consistent API responses
 */

/**
 * Standard error codes for API responses
 */
const ErrorCodes = {
  // Client errors (4xx)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  BAD_REQUEST: 'BAD_REQUEST',
  
  // Server errors (5xx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE'
};

/**
 * HTTP status codes mapping
 */
const StatusCodes = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

/**
 * Send a success response
 * @param {Response} res - Express response object
 * @param {*} data - Response data payload
 * @param {string} [message] - Optional success message
 * @param {number} [statusCode=200] - HTTP status code
 */
function success(res, data = null, message = null, statusCode = 200) {
  const response = {
    success: true
  };
  
  if (data !== null && data !== undefined) {
    response.data = data;
  }
  
  if (message) {
    response.message = message;
  }
  
  return res.status(statusCode).json(response);
}

/**
 * Send a created response (201)
 * @param {Response} res - Express response object
 * @param {*} data - Response data payload
 * @param {string} [message] - Optional success message
 */
function created(res, data, message = null) {
  return success(res, data, message, StatusCodes.CREATED);
}

/**
 * Send an error response
 * @param {Response} res - Express response object
 * @param {string} code - Error code from ErrorCodes
 * @param {string} message - Human-readable error message
 * @param {number} [statusCode=400] - HTTP status code
 * @param {Array} [details] - Optional field-level error details
 */
function error(res, code, message, statusCode = 400, details = null) {
  const errorResponse = {
    success: false,
    error: {
      code: code,
      message: message
    }
  };
  
  if (details && details.length > 0) {
    errorResponse.error.details = details;
  }
  
  return res.status(statusCode).json(errorResponse);
}

/**
 * Send a validation error response
 * @param {Response} res - Express response object
 * @param {string} message - Error message
 * @param {Array} [details] - Validation error details
 */
function validationError(res, message = 'Validation failed', details = null) {
  return error(res, ErrorCodes.VALIDATION_ERROR, message, StatusCodes.BAD_REQUEST, details);
}

/**
 * Send an unauthorized error response
 * @param {Response} res - Express response object
 * @param {string} [message] - Error message
 */
function unauthorized(res, message = 'Authentication required') {
  return error(res, ErrorCodes.UNAUTHORIZED, message, StatusCodes.UNAUTHORIZED);
}

/**
 * Send a forbidden error response
 * @param {Response} res - Express response object
 * @param {string} [message] - Error message
 */
function forbidden(res, message = 'Access denied') {
  return error(res, ErrorCodes.FORBIDDEN, message, StatusCodes.FORBIDDEN);
}

/**
 * Send a not found error response
 * @param {Response} res - Express response object
 * @param {string} [message] - Error message
 */
function notFound(res, message = 'Resource not found') {
  return error(res, ErrorCodes.NOT_FOUND, message, StatusCodes.NOT_FOUND);
}

/**
 * Send a conflict error response
 * @param {Response} res - Express response object
 * @param {string} [message] - Error message
 */
function conflict(res, message = 'Resource already exists') {
  return error(res, ErrorCodes.CONFLICT, message, StatusCodes.CONFLICT);
}

/**
 * Send a rate limited error response
 * @param {Response} res - Express response object
 * @param {string} [message] - Error message
 */
function rateLimited(res, message = 'Rate limit exceeded') {
  return error(res, ErrorCodes.RATE_LIMITED, message, StatusCodes.TOO_MANY_REQUESTS);
}

/**
 * Send an internal server error response
 * @param {Response} res - Express response object
 * @param {string} [message] - Error message
 */
function internalError(res, message = 'Internal server error') {
  return error(res, ErrorCodes.INTERNAL_ERROR, message, StatusCodes.INTERNAL_ERROR);
}

/**
 * Send a service unavailable error response
 * @param {Response} res - Express response object
 * @param {string} [message] - Error message
 */
function serviceUnavailable(res, message = 'Service temporarily unavailable') {
  return error(res, ErrorCodes.SERVICE_UNAVAILABLE, message, StatusCodes.SERVICE_UNAVAILABLE);
}

/**
 * Send a paginated success response
 * @param {Response} res - Express response object
 * @param {Array} data - Array of items
 * @param {Object} pagination - Pagination info
 * @param {number} pagination.page - Current page
 * @param {number} pagination.limit - Items per page
 * @param {number} pagination.total - Total items
 */
function paginated(res, data, pagination) {
  const totalPages = Math.ceil(pagination.total / pagination.limit);
  
  return res.status(200).json({
    success: true,
    data: data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: totalPages,
      hasMore: pagination.page < totalPages
    }
  });
}

module.exports = {
  ErrorCodes,
  StatusCodes,
  success,
  created,
  error,
  validationError,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  rateLimited,
  internalError,
  serviceUnavailable,
  paginated
};
