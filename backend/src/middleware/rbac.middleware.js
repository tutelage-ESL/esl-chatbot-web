'use strict';
const apiResponse = require('../utils/ApiResponse');

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return apiResponse.unauthorized(res, 'Authentication required');
    if (!roles.includes(req.user.role)) return apiResponse.forbidden(res, `Requires role: ${roles.join(' or ')}`);
    next();
  };
}

const requireAdmin   = requireRole('admin');
const requireTutor   = requireRole('admin', 'tutor');
const requireStudent = requireRole('student');

module.exports = { requireRole, requireAdmin, requireTutor, requireStudent };
