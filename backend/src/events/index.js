'use strict';
const EventEmitter = require('events');
const emitter = new EventEmitter();
emitter.setMaxListeners(20);
require('./listeners/onSessionEnded.listener')(emitter);
require('./listeners/onGoalUpdated.listener')(emitter);
module.exports = emitter;
