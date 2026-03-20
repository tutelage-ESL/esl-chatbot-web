'use strict';
const apiResponse = require('../utils/ApiResponse');
const { PLANS } = require('../constants/plans');

function requirePlan(...plans) {
  return async (req, res, next) => {
    // Plan guard stub — implement when subscription checks are needed
    // For now, pass through
    next();
  };
}

module.exports = { requirePlan };
