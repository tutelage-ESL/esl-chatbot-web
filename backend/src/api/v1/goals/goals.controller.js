'use strict';
const service = require('./goal.service');
const apiResponse = require('../../../utils/ApiResponse');
async function list(req, res) { try { const goals = await service.list(req.userId); return apiResponse.success(res, { goals }); } catch (err) { return apiResponse.internalError(res); } }
async function create(req, res) { try { const goal = await service.create(req.userId, req.body); return apiResponse.created(res, { goal }); } catch (err) { return apiResponse.internalError(res); } }
async function update(req, res) { try { const goal = await service.update(req.params.id, req.userId, req.body); return apiResponse.success(res, { goal }); } catch (err) { if (err.statusCode === 404) return apiResponse.notFound(res, err.message); return apiResponse.internalError(res); } }
async function remove(req, res) { try { await service.remove(req.params.id, req.userId); return apiResponse.success(res, null, 'Goal deleted'); } catch (err) { if (err.statusCode === 404) return apiResponse.notFound(res, err.message); return apiResponse.internalError(res); } }
module.exports = { list, create, update, remove };
