'use strict';
function getPaginationParams(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}
function buildPaginatedResponse(data, count, page, limit) {
  const totalPages = Math.ceil(count / limit);
  return { data, pagination: { page, limit, total: count, totalPages, hasMore: page < totalPages } };
}
module.exports = { getPaginationParams, buildPaginatedResponse };
