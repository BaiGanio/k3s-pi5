// demo/server.js — Planets API
// A minimal Express server that queries PostgreSQL and serves the SPA.
// Run:  cd /var/www/project && npm install pg express && node demo/server.js
// Then: http://localhost:3000  (Vagrant port-forwards to app-web:3000)

const express = require('express');
const { Pool } = require('pg');

const pool = new Pool({
  user: 'appuser',
  password: 'secret',
  host: '192.168.56.20',   // app-db private IP (Vagrant private_network)
  database: 'appdb',
  port: 5432,
});

const app = express();

app.get('/api/planets', async (req, res) => {
  const result = await pool.query('SELECT * FROM Planet ORDER BY PlanetID');
  res.json(result.rows);
});

app.use(express.static(require('path').join(__dirname, 'public')));

app.listen(3000, () => console.log('Planets API on :3000'));
