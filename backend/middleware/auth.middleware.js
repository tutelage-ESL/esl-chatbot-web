'use strict';
// auth.middleware.js — canonical home of JWT auth middleware.
// Old import path `./jwtMiddleware` still works via shim in jwtMiddleware.js.

const { verifyAccessToken } = require('../services/tokenService');
const apiResponse = require('../utils/apiResponse');

function requireJwtAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return apiResponse.unauthorized(res, 'Authorization header is missing');
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return apiResponse.unauthorized(res, 'Authorization header must be: Bearer <token>');
  const token = parts[1];
  const result = verifyAccessToken(token);
  if (!result.valid) return apiResponse.unauthorized(res, 'Access token is invalid or expired');
  req.user   = result.decoded;
  req.userId = result.decoded.userId;
  next();
}

function optionalJwtAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      const result = verifyAccessToken(parts[1]);
      if (result.valid) {
        req.user = result.decoded; req.userId = result.decoded.userId; req.isAuthenticated = true;
        return next();
      }
    }
  }
  req.isAuthenticated = false;
  next();
}

module.exports = { requireJwtAuth, optionalJwtAuth };
