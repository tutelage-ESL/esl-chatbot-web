/**
 * Global Error Handler Middleware
 * Catches all unhandled errors and returns standardized error responses
 */

const apiResponse = require('../utils/ApiResponse');

/**
 * Global error handler - catches all unhandled errors
 */
function globalErrorHandler(err, req, res, next) {
    // Log error for debugging
    console.error('Unhandled error:', err);

    // Handle specific error types
    if (err.name === 'SequelizeValidationError') {
        const details = err.errors.map(e => ({
            field: e.path,
            message: e.message
        }));
        return apiResponse.validationError(res, 'Validation failed', details);
    }

    if (err.name === 'SequelizeUniqueConstraintError') {
        const field = err.errors[0]?.path || 'field';
        return apiResponse.conflict(res, `${field} already exists`);
    }

    if (err.name === 'SequelizeForeignKeyConstraintError') {
        return apiResponse.error(
            res,
            apiResponse.ErrorCodes.BAD_REQUEST,
            'Invalid reference - related resource not found',
            400
        );
    }

    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return apiResponse.unauthorized(res, 'Invalid or expired token');
    }

    if (err.name === 'MulterError') {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return apiResponse.validationError(res, 'File too large');
        }
        return apiResponse.validationError(res, err.message);
    }

    // Default to internal server error
    const message = process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message || 'Internal server error';

    return apiResponse.internalError(res, message);
}

/**
 * 404 Not Found handler - for undefined routes
 */
function notFoundHandler(req, res) {
    return apiResponse.notFound(res, `Route ${req.method} ${req.path} not found`);
}

module.exports = {
    globalErrorHandler,
    notFoundHandler
};
