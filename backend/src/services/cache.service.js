'use strict';
// In-memory cache stub — swap for Redis when available
const store = new Map();
const get = (key) => store.get(key) || null;
const set = (key, value, ttlMs = 60000) => { store.set(key, value); setTimeout(() => store.delete(key), ttlMs); };
const del = (key) => store.delete(key);
const clear = () => store.clear();
module.exports = { get, set, del, clear };
