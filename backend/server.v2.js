'use strict';
require('dotenv').config();
const { server } = require('./src/app.v2');
const db = require('./src/models');
const config = require('./src/config');
const V2_PORT = parseInt(process.env.PORT_V2, 10) || 3002;

db.sequelize.sync({ alter: false })
  .then(() => {
    console.log('Database connected for v2 server.');
    server.listen(V2_PORT, () => {
      console.log(`[v2] API Server running on port ${V2_PORT}`);
      console.log(`[v2] Swagger docs at http://localhost:${V2_PORT}/api/docs`);
    });
  })
  .catch(err => { console.error('Database connection failed (v2):', err); process.exit(1); });
