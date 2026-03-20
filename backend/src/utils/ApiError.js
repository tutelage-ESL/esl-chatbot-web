'use strict';
class ApiError extends Error {
  constructor(statusCode, message, code = null, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || 'ERROR';
    this.details = details;
    this.isOperational = true;
  }
  static badRequest(msg, details) { return new ApiError(400, msg, 'BAD_REQUEST', details); }
  static unauthorized(msg = 'Authentication required') { return new ApiError(401, msg, 'UNAUTHORIZED'); }
  static forbidden(msg = 'Access denied') { return new ApiError(403, msg, 'FORBIDDEN'); }
  static notFound(msg = 'Resource not found') { return new ApiError(404, msg, 'NOT_FOUND'); }
  static conflict(msg = 'Resource already exists') { return new ApiError(409, msg, 'CONFLICT'); }
  static internal(msg = 'Internal server error') { return new ApiError(500, msg, 'INTERNAL_ERROR'); }
}
module.exports = ApiError;
